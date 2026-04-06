use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::Result;

/// TaskSlot: binds a Task to a position in a TaskGroup
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskSlot {
    /// 1-9 button position
    pub position: u8,
    /// Project hash
    pub project_id: String,
    /// Task ID
    pub task_id: String,
    /// Target chat ID (None = auto-select)
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_chat_id: Option<String>,
}

/// TaskGroup: a group of tasks (frequency band for walkie-talkie)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskGroup {
    /// UUID
    pub id: String,
    /// Group name
    pub name: String,
    /// Optional color
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    /// Task slots
    #[serde(default)]
    pub slots: Vec<TaskSlot>,
    /// Creation time
    pub created_at: DateTime<Utc>,
}

/// TOML wrapper struct
#[derive(Debug, Default, Serialize, Deserialize)]
struct TaskGroupsFile {
    #[serde(default)]
    groups: Vec<TaskGroup>,
}

/// Get the path to ~/.grove/taskgroups.toml
fn taskgroups_file_path() -> std::path::PathBuf {
    super::grove_dir().join("taskgroups.toml")
}

/// Load all task groups from TOML. Returns empty vec if file doesn't exist.
pub fn load_groups() -> Result<Vec<TaskGroup>> {
    let path = taskgroups_file_path();
    if !path.exists() {
        return Ok(Vec::new());
    }
    let file: TaskGroupsFile = super::load_toml(&path)?;
    Ok(file.groups)
}

/// Save task groups to TOML.
fn save_groups(groups: &[TaskGroup]) -> Result<()> {
    let path = taskgroups_file_path();
    // Ensure ~/.grove/ exists
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let file = TaskGroupsFile {
        groups: groups.to_vec(),
    };
    super::save_toml(&path, &file)
}

/// Create a new task group with a UUID.
pub fn create_group(name: String, color: Option<String>) -> Result<TaskGroup> {
    let group = TaskGroup {
        id: Uuid::new_v4().to_string(),
        name,
        color,
        slots: Vec::new(),
        created_at: Utc::now(),
    };

    let mut groups = load_groups()?;
    groups.push(group.clone());
    save_groups(&groups)?;

    Ok(group)
}

/// Update a task group's name and/or color. Returns the updated group if found.
///
/// For `color`: `Some(Some("red"))` sets color, `Some(None)` clears color, `None` leaves unchanged.
pub fn update_group(
    id: &str,
    name: Option<String>,
    color: Option<Option<String>>,
) -> Result<Option<TaskGroup>> {
    let mut groups = load_groups()?;

    let Some(group) = groups.iter_mut().find(|g| g.id == id) else {
        return Ok(None);
    };

    if let Some(new_name) = name {
        group.name = new_name;
    }
    if let Some(new_color) = color {
        group.color = new_color;
    }

    let updated = group.clone();
    save_groups(&groups)?;
    Ok(Some(updated))
}

/// Delete a task group by ID. Returns true if the group was found and removed.
pub fn delete_group(id: &str) -> Result<bool> {
    let mut groups = load_groups()?;
    let len_before = groups.len();
    groups.retain(|g| g.id != id);
    let removed = groups.len() < len_before;
    if removed {
        save_groups(&groups)?;
    }
    Ok(removed)
}

/// Upsert a slot in a task group. Replaces any existing slot at the same position.
/// Slots are sorted by position after insertion.
/// Returns the updated group if found.
pub fn upsert_slot(group_id: &str, slot: TaskSlot) -> Result<Option<TaskGroup>> {
    let mut groups = load_groups()?;

    let Some(group) = groups.iter_mut().find(|g| g.id == group_id) else {
        return Ok(None);
    };

    // Remove existing slot at the same position
    group.slots.retain(|s| s.position != slot.position);
    group.slots.push(slot);
    group.slots.sort_by_key(|s| s.position);

    let updated = group.clone();
    save_groups(&groups)?;
    Ok(Some(updated))
}

/// Remove a slot from a task group by position.
/// Returns the updated group if found.
pub fn remove_slot(group_id: &str, position: u8) -> Result<Option<TaskGroup>> {
    let mut groups = load_groups()?;

    let Some(group) = groups.iter_mut().find(|g| g.id == group_id) else {
        return Ok(None);
    };

    group.slots.retain(|s| s.position != position);

    let updated = group.clone();
    save_groups(&groups)?;
    Ok(Some(updated))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    /// All tests share `~/.grove/taskgroups.toml`, so we serialize them.
    static FILE_LOCK: Mutex<()> = Mutex::new(());

    /// Helper that creates a group and ensures it gets deleted on drop.
    struct TestGroup {
        pub id: String,
    }

    impl TestGroup {
        fn create(name: &str, color: Option<String>) -> (Self, TaskGroup) {
            let group = create_group(name.to_string(), color).expect("create_group failed");
            let guard = Self {
                id: group.id.clone(),
            };
            (guard, group)
        }
    }

    impl Drop for TestGroup {
        fn drop(&mut self) {
            let _ = delete_group(&self.id);
        }
    }

    #[test]
    fn test_create_and_load_group() {
        let _lock = FILE_LOCK.lock().unwrap();
        let (guard, group) = TestGroup::create("test_create_load", Some("blue".into()));

        assert_eq!(group.name, "test_create_load");
        assert_eq!(group.color, Some("blue".to_string()));
        assert!(group.slots.is_empty());

        // Verify it appears in load_groups
        let groups = load_groups().unwrap();
        let found = groups.iter().find(|g| g.id == guard.id);
        assert!(
            found.is_some(),
            "created group should appear in load_groups"
        );
        assert_eq!(found.unwrap().name, "test_create_load");
    }

    #[test]
    fn test_update_group() {
        let _lock = FILE_LOCK.lock().unwrap();
        let (guard, _group) = TestGroup::create("test_update_orig", None);

        // Update name only
        let updated = update_group(&guard.id, Some("test_update_renamed".into()), None)
            .unwrap()
            .expect("group should be found");
        assert_eq!(updated.name, "test_update_renamed");
        assert_eq!(updated.color, None);

        // Set color
        let updated = update_group(&guard.id, None, Some(Some("red".into())))
            .unwrap()
            .expect("group should be found");
        assert_eq!(updated.name, "test_update_renamed");
        assert_eq!(updated.color, Some("red".to_string()));

        // Clear color
        let updated = update_group(&guard.id, None, Some(None))
            .unwrap()
            .expect("group should be found");
        assert_eq!(updated.color, None);

        // Update non-existent group
        let result = update_group("nonexistent-id", Some("x".into()), None).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_delete_group() {
        let _lock = FILE_LOCK.lock().unwrap();
        let group = create_group("test_delete_me".into(), None).unwrap();
        let id = group.id.clone();

        // Delete should succeed
        assert!(delete_group(&id).unwrap());

        // Second delete should return false
        assert!(!delete_group(&id).unwrap());

        // Should no longer appear in load_groups
        let groups = load_groups().unwrap();
        assert!(groups.iter().all(|g| g.id != id));
    }

    #[test]
    fn test_upsert_and_remove_slot() {
        let _lock = FILE_LOCK.lock().unwrap();
        let (guard, _group) = TestGroup::create("test_slots", None);

        // Add a slot at position 1
        let slot1 = TaskSlot {
            position: 1,
            project_id: "proj_a".into(),
            task_id: "task_1".into(),
            target_chat_id: None,
        };
        let updated = upsert_slot(&guard.id, slot1).unwrap().unwrap();
        assert_eq!(updated.slots.len(), 1);
        assert_eq!(updated.slots[0].position, 1);
        assert_eq!(updated.slots[0].task_id, "task_1");

        // Add a slot at position 3
        let slot3 = TaskSlot {
            position: 3,
            project_id: "proj_b".into(),
            task_id: "task_3".into(),
            target_chat_id: Some("chat_x".into()),
        };
        let updated = upsert_slot(&guard.id, slot3).unwrap().unwrap();
        assert_eq!(updated.slots.len(), 2);

        // Upsert (replace) slot at position 1
        let slot1_new = TaskSlot {
            position: 1,
            project_id: "proj_c".into(),
            task_id: "task_1_replaced".into(),
            target_chat_id: None,
        };
        let updated = upsert_slot(&guard.id, slot1_new).unwrap().unwrap();
        assert_eq!(updated.slots.len(), 2);
        assert_eq!(updated.slots[0].task_id, "task_1_replaced");

        // Remove slot at position 3
        let updated = remove_slot(&guard.id, 3).unwrap().unwrap();
        assert_eq!(updated.slots.len(), 1);
        assert_eq!(updated.slots[0].position, 1);

        // Remove non-existent slot (should still succeed, just no change)
        let updated = remove_slot(&guard.id, 9).unwrap().unwrap();
        assert_eq!(updated.slots.len(), 1);

        // Upsert/remove on non-existent group
        let slot = TaskSlot {
            position: 1,
            project_id: "x".into(),
            task_id: "y".into(),
            target_chat_id: None,
        };
        assert!(upsert_slot("nonexistent", slot).unwrap().is_none());
        assert!(remove_slot("nonexistent", 1).unwrap().is_none());
    }

    #[test]
    fn test_slot_sorting() {
        let _lock = FILE_LOCK.lock().unwrap();
        let (guard, _group) = TestGroup::create("test_slot_sort", None);

        // Insert slots in reverse order: 5, 3, 1, 9, 2
        for pos in [5, 3, 1, 9, 2] {
            let slot = TaskSlot {
                position: pos,
                project_id: format!("proj_{pos}"),
                task_id: format!("task_{pos}"),
                target_chat_id: None,
            };
            upsert_slot(&guard.id, slot).unwrap();
        }

        // Load and verify slots are sorted by position
        let groups = load_groups().unwrap();
        let group = groups.iter().find(|g| g.id == guard.id).unwrap();
        let positions: Vec<u8> = group.slots.iter().map(|s| s.position).collect();
        assert_eq!(positions, vec![1, 2, 3, 5, 9]);
    }
}
