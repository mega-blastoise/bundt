//! When to restart a renderer that exited unexpectedly — a pure state
//! machine, so the policy is unit-tested without processes or clocks.

use std::collections::VecDeque;
use std::time::{Duration, Instant};

/// A renderer that stayed up this long is considered healthy again: the next
/// crash starts the backoff from the beginning.
pub(crate) const STABLE_AFTER: Duration = Duration::from_secs(30);

/// Length of the window `max_restarts` is counted over.
pub(crate) const RESTART_WINDOW: Duration = Duration::from_secs(60);

/// Restart settings chosen on the builder.
#[derive(Debug, Clone, Copy)]
pub(crate) struct RestartSettings {
    pub initial_backoff: Duration,
    pub max_backoff: Duration,
    /// Restarts allowed within [`RESTART_WINDOW`] before giving up.
    pub max_restarts: u32,
}

/// What to do after the renderer exited.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Decision {
    /// Wait this long, then start a new renderer.
    RestartAfter(Duration),
    /// Too many restarts in the window: stop trying.
    GiveUp,
}

/// Restart bookkeeping for one supervisor.
#[derive(Debug)]
pub(crate) struct RestartPolicy {
    settings: RestartSettings,
    /// Crashes since the renderer was last stable; drives the backoff.
    consecutive_failures: u32,
    /// Start times of recent restarts, oldest first, within the window.
    recent_restarts: VecDeque<Instant>,
}

impl RestartPolicy {
    pub(crate) fn new(settings: RestartSettings) -> Self {
        Self { settings, consecutive_failures: 0, recent_restarts: VecDeque::new() }
    }

    /// Decides what to do about a renderer that started at `started` and
    /// exited at `now`. A `RestartAfter` decision counts as a restart.
    pub(crate) fn on_exit(&mut self, started: Instant, now: Instant) -> Decision {
        if now.saturating_duration_since(started) >= STABLE_AFTER {
            self.consecutive_failures = 0;
        }
        while self.recent_restarts.front().is_some_and(|&at| now.saturating_duration_since(at) >= RESTART_WINDOW) {
            self.recent_restarts.pop_front();
        }
        if self.recent_restarts.len() >= self.settings.max_restarts as usize {
            return Decision::GiveUp;
        }

        let delay = self.backoff();
        self.consecutive_failures = self.consecutive_failures.saturating_add(1);
        self.recent_restarts.push_back(now);
        Decision::RestartAfter(delay)
    }

    /// `initial · 2^failures`, capped at `max_backoff`.
    fn backoff(&self) -> Duration {
        let factor = 1u32.checked_shl(self.consecutive_failures).unwrap_or(u32::MAX);
        self.settings.initial_backoff.saturating_mul(factor).min(self.settings.max_backoff)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SETTINGS: RestartSettings =
        RestartSettings { initial_backoff: Duration::from_millis(100), max_backoff: Duration::from_secs(1), max_restarts: 5 };

    fn ms(value: u64) -> Duration {
        Duration::from_millis(value)
    }

    #[test]
    fn backs_off_exponentially_up_to_the_cap() {
        let mut policy = RestartPolicy::new(RestartSettings { max_restarts: 100, ..SETTINGS });
        let start = Instant::now();
        let delays: Vec<_> = (0..6).map(|_| policy.on_exit(start, start)).collect();
        assert_eq!(
            delays,
            [100, 200, 400, 800, 1000, 1000].map(|value| Decision::RestartAfter(ms(value))).to_vec()
        );
    }

    #[test]
    fn a_stable_renderer_resets_the_backoff() {
        let mut policy = RestartPolicy::new(SETTINGS);
        let start = Instant::now();
        policy.on_exit(start, start);
        policy.on_exit(start, start);
        let later = start + STABLE_AFTER;
        assert_eq!(policy.on_exit(start, later), Decision::RestartAfter(ms(100)));
    }

    #[test]
    fn gives_up_after_max_restarts_within_the_window() {
        let mut policy = RestartPolicy::new(SETTINGS);
        let start = Instant::now();
        for _ in 0..SETTINGS.max_restarts {
            assert!(matches!(policy.on_exit(start, start), Decision::RestartAfter(_)));
        }
        assert_eq!(policy.on_exit(start, start), Decision::GiveUp);
    }

    #[test]
    fn restarts_outside_the_window_no_longer_count() {
        let mut policy = RestartPolicy::new(SETTINGS);
        let start = Instant::now();
        for _ in 0..SETTINGS.max_restarts {
            policy.on_exit(start, start);
        }
        let after_window = start + RESTART_WINDOW;
        assert!(matches!(policy.on_exit(after_window, after_window), Decision::RestartAfter(_)));
    }
}
