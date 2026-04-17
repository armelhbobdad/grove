use std::path::Path;

/// Create a cross-platform filesystem link.
///
/// - Files: hard link (no elevated permissions required on any platform)
/// - Directories: symlink on Unix, junction on Windows (no Developer Mode required)
///
/// Note: `source.is_dir()` follows symlinks, so a symlink pointing to a directory
/// will use the directory path (junction on Windows, symlink on Unix).
pub fn create_link(source: &Path, target: &Path) -> std::io::Result<()> {
    if source.is_dir() {
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(source, target)
        }
        #[cfg(windows)]
        {
            junction::create(source, target)
        }
        #[cfg(not(any(unix, windows)))]
        {
            Err(std::io::Error::new(
                std::io::ErrorKind::Unsupported,
                "Directory linking not supported on this platform",
            ))
        }
    } else {
        std::fs::hard_link(source, target)
    }
}

/// Returns true if the path is a filesystem link created by `create_link`.
///
/// On Unix this checks for symlinks. On Windows this additionally detects
/// junction points, which do not report as symlinks via `is_symlink()`.
pub fn is_link(path: &Path) -> bool {
    if path.is_symlink() {
        return true;
    }
    #[cfg(windows)]
    {
        junction::exists(path).unwrap_or(false)
    }
    #[cfg(not(windows))]
    false
}
