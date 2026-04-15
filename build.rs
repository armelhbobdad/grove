//! Build script for Grove
//!
//! The published crate includes pre-built frontend assets in `grove-web/dist`
//! so `cargo install grove-rs --features gui` does not require Node.js.

use std::path::Path;
use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=grove-web/dist");
    println!("cargo:rerun-if-changed=grove-web/src");
    println!("cargo:rerun-if-changed=grove-web/index.html");
    println!("cargo:rerun-if-changed=grove-web/package.json");

    ensure_frontend_dist();
    build_tauri();
}

fn ensure_frontend_dist() {
    let dist_dir = Path::new("grove-web/dist");
    let grove_web_dir = Path::new("grove-web");

    if dist_dir.join("index.html").exists() {
        return;
    }

    if !grove_web_dir.exists() {
        panic!("grove-web/dist is missing from the package");
    }

    let npm_check = Command::new("npm").arg("--version").output();
    if npm_check.is_err() || !npm_check.unwrap().status.success() {
        panic!("grove-web/dist is missing; run `npm run build --prefix grove-web` before building");
    }

    println!("cargo:warning=Building frontend (this may take a moment)...");

    let node_modules = grove_web_dir.join("node_modules");
    if !node_modules.exists()
        && !run_npm(grove_web_dir, "ci")
        && !run_npm(grove_web_dir, "install")
    {
        panic!("failed to install frontend dependencies");
    }

    if !run_npm(grove_web_dir, "run build") {
        panic!("failed to build frontend; run `npm run build --prefix grove-web` for details");
    }

    if !dist_dir.join("index.html").exists() {
        panic!("frontend build did not produce grove-web/dist/index.html");
    }
}

fn run_npm(dir: &Path, command: &str) -> bool {
    let mut cmd = Command::new("npm");
    cmd.current_dir(dir);
    for arg in command.split_whitespace() {
        cmd.arg(arg);
    }

    cmd.status().map(|status| status.success()).unwrap_or(false)
}

fn build_tauri() {
    #[cfg(feature = "gui")]
    tauri_build::build();
}
