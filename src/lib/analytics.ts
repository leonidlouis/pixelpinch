import posthog from 'posthog-js';

type EventName =
    | 'compression_started'
    | 'compression_completed'
    | 'compression_failed'
    | 'batch_completed'
    | 'files_added'
    | 'download_clicked'
    | 'support_clicked'
    | 'error_occurred'
    | 'settings_changed'
    | 'help_clicked'
    | 'clear_all_clicked'
    | 'support_menu_opened'
    | 'preview_opened'
    | 'preview_toggle_clicked';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventProperties = { active_user_account?: string | null; } & Record<string, any>;

export const sendEvent = (name: EventName, properties?: EventProperties) => {
    // 1. Send to PostHog
    if (typeof window !== 'undefined') {
        try {
            posthog.capture(name, properties);
        } catch (e) {
            console.error('Failed to send event to PostHog', e);
        }
    }
};
