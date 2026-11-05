# RC3: Free-message quota notice and timed reminder

Claude composer may show `You are out of free messages until 10:20 PM` even when there is no paused response and no Continue button. The extension captures the reset time independently of any conversation, stores it under a site-wide key, schedules a browser notification, and displays the local countdown in the toolbar popup.

The alarm says the **announced time has arrived**, not that the quota is definitely restored. The user should reopen Claude. Notification delivery when the browser is fully closed, on mobile, or when notifications are disabled is subject to the browser and operating system. Tampermonkey cannot provide a browser-background alarm; its on-page reminder is opportunistic.

No extra web requests, message submission, or rate-limit circumvention occurs. Do not use a generic Continue selector on composer banners.
