//! Agent Graph 数据层
//!
//! 表：session / agent_edge / agent_pending_message
//! CRUD 实现见后续 WO（WO-003 / WO-004 / WO-005）

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};

use crate::error::{GroveError, Result};

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct AgentEdge {
    pub edge_id: i64,
    pub task_id: String,
    pub from_session: String,
    pub to_session: String,
    pub purpose: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct AgentPendingMessage {
    pub msg_id: String,
    pub task_id: String,
    pub from_session: String,
    pub to_session: String,
    pub body: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct GcStats {
    pub sessions_deleted: usize,
    pub edges_deleted: usize,
    pub pending_messages_deleted: usize,
}

#[allow(dead_code)]
fn storage_error(token: &str) -> GroveError {
    GroveError::storage(token)
}

#[allow(dead_code)]
fn row_to_edge(row: &rusqlite::Row<'_>) -> rusqlite::Result<AgentEdge> {
    let created_at: String = row.get(5)?;
    let created_at = DateTime::parse_from_rfc3339(&created_at)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());

    Ok(AgentEdge {
        edge_id: row.get(0)?,
        task_id: row.get(1)?,
        from_session: row.get(2)?,
        to_session: row.get(3)?,
        purpose: row.get(4)?,
        created_at,
    })
}

/// 创建一条边。返回 edge_id。
#[allow(dead_code)]
pub fn add_edge(
    conn: &Connection,
    task_id: &str,
    from_session: &str,
    to_session: &str,
    purpose: Option<&str>,
) -> Result<i64> {
    let tx = conn.unchecked_transaction()?;

    let from_task: Option<String> = tx
        .query_row(
            "SELECT task_id FROM session WHERE session_id = ?1",
            [from_session],
            |row| row.get(0),
        )
        .optional()?;
    let to_task: Option<String> = tx
        .query_row(
            "SELECT task_id FROM session WHERE session_id = ?1",
            [to_session],
            |row| row.get(0),
        )
        .optional()?;

    let (Some(from_task), Some(to_task)) = (from_task, to_task) else {
        return Err(storage_error("endpoint_not_found"));
    };

    if from_task != task_id || to_task != task_id {
        return Err(storage_error("same_task_required"));
    }

    let duplicate = tx
        .query_row(
            "SELECT 1 FROM agent_edge WHERE from_session = ?1 AND to_session = ?2",
            params![from_session, to_session],
            |_| Ok(()),
        )
        .optional()?
        .is_some();
    if duplicate {
        return Err(storage_error("duplicate_edge"));
    }

    let bidirectional = tx
        .query_row(
            "SELECT 1 FROM agent_edge WHERE from_session = ?1 AND to_session = ?2",
            params![to_session, from_session],
            |_| Ok(()),
        )
        .optional()?
        .is_some();
    if bidirectional {
        return Err(storage_error("bidirectional_edge"));
    }

    let cycle = from_session == to_session
        || tx
            .query_row(
                "WITH RECURSIVE reachable(s) AS (
                   SELECT to_session FROM agent_edge WHERE from_session = ?1
                   UNION
                   SELECT e.to_session
                   FROM agent_edge e
                   JOIN reachable r ON e.from_session = r.s
                 )
                 SELECT 1 FROM reachable WHERE s = ?2",
                params![to_session, from_session],
                |_| Ok(()),
            )
            .optional()?
            .is_some();
    if cycle {
        return Err(storage_error("cycle_would_form"));
    }

    tx.execute(
        "INSERT INTO agent_edge (task_id, from_session, to_session, purpose, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            task_id,
            from_session,
            to_session,
            purpose,
            Utc::now().to_rfc3339(),
        ],
    )?;
    let edge_id = tx.last_insert_rowid();
    tx.commit()?;
    Ok(edge_id)
}

/// 删除一条边（按 edge_id），并删除该边上的 pending message。
#[allow(dead_code)]
pub fn delete_edge(conn: &Connection, edge_id: i64) -> Result<()> {
    let tx = conn.unchecked_transaction()?;
    let endpoints: Option<(String, String)> = tx
        .query_row(
            "SELECT from_session, to_session FROM agent_edge WHERE edge_id = ?1",
            [edge_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()?;

    if let Some((from_session, to_session)) = endpoints {
        tx.execute(
            "DELETE FROM agent_pending_message WHERE from_session = ?1 AND to_session = ?2",
            params![from_session, to_session],
        )?;
        tx.execute("DELETE FROM agent_edge WHERE edge_id = ?1", [edge_id])?;
    }

    tx.commit()?;
    Ok(())
}

/// 更新 purpose（可设 Some 或 None 清空）。
#[allow(dead_code)]
pub fn update_edge_purpose(conn: &Connection, edge_id: i64, purpose: Option<&str>) -> Result<()> {
    conn.execute(
        "UPDATE agent_edge SET purpose = ?1 WHERE edge_id = ?2",
        params![purpose, edge_id],
    )?;
    Ok(())
}

/// 按 edge_id 取一条边。
#[allow(dead_code)]
pub fn get_edge(conn: &Connection, edge_id: i64) -> Result<Option<AgentEdge>> {
    let edge = conn
        .query_row(
            "SELECT edge_id, task_id, from_session, to_session, purpose, created_at
             FROM agent_edge
             WHERE edge_id = ?1",
            [edge_id],
            row_to_edge,
        )
        .optional()?;
    Ok(edge)
}

/// 取某 task 下所有边（用于 graph 渲染）。
#[allow(dead_code)]
pub fn list_edges_for_task(conn: &Connection, task_id: &str) -> Result<Vec<AgentEdge>> {
    let mut stmt = conn.prepare(
        "SELECT edge_id, task_id, from_session, to_session, purpose, created_at
         FROM agent_edge
         WHERE task_id = ?1
         ORDER BY edge_id ASC",
    )?;
    let edges = stmt
        .query_map([task_id], row_to_edge)?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    Ok(edges)
}

/// 删除 session 时的级联清理：删除该 session 涉及的所有 edge / pending_message。
pub fn cascade_delete_for_session(conn: &Connection, session_id: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM agent_edge WHERE from_session = ?1 OR to_session = ?1",
        [session_id],
    )?;
    conn.execute(
        "DELETE FROM agent_pending_message WHERE from_session = ?1 OR to_session = ?1",
        [session_id],
    )?;
    Ok(())
}

/// 删除 task 时的级联清理：删除该 project + task 下所有 session / edge / pending_message。
pub fn cascade_delete_for_task(conn: &Connection, project: &str, task_id: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM agent_pending_message WHERE task_id = ?1",
        [task_id],
    )?;
    conn.execute("DELETE FROM agent_edge WHERE task_id = ?1", [task_id])?;
    conn.execute(
        "DELETE FROM session WHERE project = ?1 AND task_id = ?2",
        params![project, task_id],
    )?;
    Ok(())
}

/// 启动时清理孤儿 session / edge / pending_message。
pub fn gc_orphans(conn: &Connection) -> Result<GcStats> {
    let mut valid = std::collections::HashSet::new();
    let projects_dir = crate::storage::grove_dir().join("projects");
    if let Ok(projects) = std::fs::read_dir(projects_dir) {
        for project in projects.flatten() {
            if !project.path().is_dir() {
                continue;
            }
            let project_id = project.file_name().to_string_lossy().to_string();

            for task in crate::storage::tasks::load_tasks(&project_id).unwrap_or_default() {
                valid.insert((project_id.clone(), task.id));
            }
            for task in crate::storage::tasks::load_archived_tasks(&project_id).unwrap_or_default()
            {
                valid.insert((project_id.clone(), task.id));
            }
        }
    }

    let sessions: Vec<(String, String)> = {
        let mut stmt = conn.prepare("SELECT project, task_id FROM session")?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        rows.filter_map(|r| r.ok()).collect()
    };

    let tx = conn.unchecked_transaction()?;
    let mut sessions_deleted = 0;
    for (project, task_id) in sessions {
        if !valid.contains(&(project.clone(), task_id.clone())) {
            sessions_deleted += tx.execute(
                "DELETE FROM session WHERE project = ?1 AND task_id = ?2",
                params![project, task_id],
            )?;
        }
    }

    let edges_deleted = tx.execute(
        "DELETE FROM agent_edge
         WHERE from_session NOT IN (SELECT session_id FROM session)
            OR to_session NOT IN (SELECT session_id FROM session)",
        [],
    )?;
    let pending_messages_deleted = tx.execute(
        "DELETE FROM agent_pending_message
         WHERE from_session NOT IN (SELECT session_id FROM session)
            OR to_session NOT IN (SELECT session_id FROM session)",
        [],
    )?;
    tx.commit()?;

    Ok(GcStats {
        sessions_deleted,
        edges_deleted,
        pending_messages_deleted,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        crate::storage::database::create_schema(&conn).unwrap();
        conn
    }

    fn insert_session(conn: &Connection, session_id: &str, task_id: &str) {
        conn.execute(
            "INSERT INTO session
             (session_id, project, task_id, title, agent, acp_session_id, duty, created_at)
             VALUES (?1, 'project-a', ?2, ?3, 'codex', NULL, NULL, ?4)",
            params![
                session_id,
                task_id,
                format!("Session {session_id}"),
                Utc::now().to_rfc3339(),
            ],
        )
        .unwrap();
    }

    fn err_token(result: Result<i64>) -> String {
        result.unwrap_err().to_string()
    }

    #[test]
    fn add_edge_happy_path_allows_chain() {
        let conn = test_conn();
        for session in ["a", "b", "c"] {
            insert_session(&conn, session, "task-1");
        }

        let ab = add_edge(&conn, "task-1", "a", "b", Some("delegate")).unwrap();
        let bc = add_edge(&conn, "task-1", "b", "c", None).unwrap();

        let first = get_edge(&conn, ab).unwrap().unwrap();
        assert_eq!(first.from_session, "a");
        assert_eq!(first.to_session, "b");
        assert_eq!(first.purpose.as_deref(), Some("delegate"));
        assert!(bc > ab);
    }

    #[test]
    fn add_edge_rejects_duplicate_edge() {
        let conn = test_conn();
        insert_session(&conn, "a", "task-1");
        insert_session(&conn, "b", "task-1");

        add_edge(&conn, "task-1", "a", "b", None).unwrap();
        let err = err_token(add_edge(&conn, "task-1", "a", "b", None));

        assert!(err.contains("duplicate_edge"));
    }

    #[test]
    fn add_edge_rejects_bidirectional_edge() {
        let conn = test_conn();
        insert_session(&conn, "a", "task-1");
        insert_session(&conn, "b", "task-1");

        add_edge(&conn, "task-1", "a", "b", None).unwrap();
        let err = err_token(add_edge(&conn, "task-1", "b", "a", None));

        assert!(err.contains("bidirectional_edge"));
    }

    #[test]
    fn add_edge_rejects_long_cycle() {
        let conn = test_conn();
        for session in ["a", "b", "c", "d"] {
            insert_session(&conn, session, "task-1");
        }

        add_edge(&conn, "task-1", "a", "b", None).unwrap();
        add_edge(&conn, "task-1", "b", "c", None).unwrap();
        add_edge(&conn, "task-1", "c", "d", None).unwrap();
        let err = err_token(add_edge(&conn, "task-1", "d", "a", None));

        assert!(err.contains("cycle_would_form"));
    }

    #[test]
    fn add_edge_rejects_cross_task_endpoints() {
        let conn = test_conn();
        insert_session(&conn, "a", "task-1");
        insert_session(&conn, "b", "task-2");

        let err = err_token(add_edge(&conn, "task-1", "a", "b", None));

        assert!(err.contains("same_task_required"));
    }

    #[test]
    fn add_edge_rejects_missing_endpoint() {
        let conn = test_conn();
        insert_session(&conn, "a", "task-1");

        let err = err_token(add_edge(&conn, "task-1", "a", "missing", None));

        assert!(err.contains("endpoint_not_found"));
    }

    #[test]
    fn delete_edge_cascades_pending_message_on_same_edge() {
        let conn = test_conn();
        insert_session(&conn, "a", "task-1");
        insert_session(&conn, "b", "task-1");
        let edge_id = add_edge(&conn, "task-1", "a", "b", None).unwrap();
        conn.execute(
            "INSERT INTO agent_pending_message
             (msg_id, task_id, from_session, to_session, body, created_at)
             VALUES ('msg-1', 'task-1', 'a', 'b', 'hello', ?1)",
            [Utc::now().to_rfc3339()],
        )
        .unwrap();

        delete_edge(&conn, edge_id).unwrap();

        let pending_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM agent_pending_message", [], |row| {
                row.get(0)
            })
            .unwrap();
        let edge_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM agent_edge", [], |row| row.get(0))
            .unwrap();
        assert_eq!(pending_count, 0);
        assert_eq!(edge_count, 0);
    }

    #[test]
    fn update_edge_purpose_round_trips_some_and_none() {
        let conn = test_conn();
        insert_session(&conn, "a", "task-1");
        insert_session(&conn, "b", "task-1");
        let edge_id = add_edge(&conn, "task-1", "a", "b", None).unwrap();

        update_edge_purpose(&conn, edge_id, Some("handoff")).unwrap();
        assert_eq!(
            get_edge(&conn, edge_id)
                .unwrap()
                .unwrap()
                .purpose
                .as_deref(),
            Some("handoff")
        );

        update_edge_purpose(&conn, edge_id, None).unwrap();
        assert_eq!(get_edge(&conn, edge_id).unwrap().unwrap().purpose, None);
    }

    #[test]
    fn list_edges_for_task_filters_by_task() {
        let conn = test_conn();
        for session in ["a", "b", "c"] {
            insert_session(&conn, session, "task-1");
        }
        insert_session(&conn, "x", "task-2");
        insert_session(&conn, "y", "task-2");
        add_edge(&conn, "task-1", "a", "b", None).unwrap();
        add_edge(&conn, "task-1", "b", "c", None).unwrap();
        add_edge(&conn, "task-2", "x", "y", None).unwrap();

        let edges = list_edges_for_task(&conn, "task-1").unwrap();

        assert_eq!(edges.len(), 2);
        assert!(edges.iter().all(|edge| edge.task_id == "task-1"));
        assert_eq!(edges[0].from_session, "a");
        assert_eq!(edges[1].from_session, "b");
    }
}
