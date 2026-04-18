//! WebSocket endpoint streaming sketch events for a single task.

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path,
    },
    response::Response,
};

use super::super::common::find_project_by_id;
use super::sketch_events::{subscribe, SketchEvent};

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Path((id, task_id)): Path<(String, String)>,
) -> Response {
    // Resolve once on upgrade. If the project/task doesn't exist the handler
    // still upgrades; events simply never match and the socket is a no-op.
    let project_key = find_project_by_id(&id).map(|(_p, k)| k).unwrap_or_default();
    ws.on_upgrade(move |socket| handle(socket, project_key, task_id))
}

async fn handle(mut socket: WebSocket, project_key: String, task_id: String) {
    let mut rx = subscribe();
    loop {
        tokio::select! {
            // Outgoing: filter events by project + task
            evt = rx.recv() => match evt {
                Ok(event) => {
                    if matches(&event, &project_key, &task_id) {
                        if let Ok(text) = serde_json::to_string(&event) {
                            if socket.send(Message::Text(text.into())).await.is_err() {
                                break;
                            }
                        }
                    }
                }
                Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                Err(_) => break,
            },
            // Incoming: we only care about close pings
            inc = socket.recv() => match inc {
                Some(Ok(Message::Close(_))) | None => break,
                Some(Ok(_)) => {}
                Some(Err(_)) => break,
            }
        }
    }
}

fn matches(event: &SketchEvent, project: &str, task_id: &str) -> bool {
    match event {
        SketchEvent::SketchUpdated {
            project: p,
            task_id: t,
            ..
        }
        | SketchEvent::IndexChanged {
            project: p,
            task_id: t,
        } => p == project && t == task_id,
    }
}
