# Little Focus 2.0

A Chiikawa-inspired Pomodoro productivity app built with HTML, CSS, and Vanilla JavaScript.

Little Focus helps you manage Focus and Play Time sessions, track your productivity, review completed sessions, and customize your timer experience.

## Features

### Pomodoro Timer
- Focus and Play Time modes.
- Customizable Focus duration (1–180 minutes).
- Customizable Play Time duration (1–60 minutes).
- Start, pause, resume, and reset controls.
- Automatic mode transition after session completion.

### Statistics and Productivity Tracking
- Total completed Focus sessions.
- Total Focus time.
- Daily Focus time.
- Weekly Focus time.
- Average Focus session duration.
- Daily productivity goal and progress indicator.
- Weekly activity chart.

### Calendar and Session History
- Monthly calendar navigation.
- Previous and next month navigation.
- Calendar support across years.
- Visual indicators for today, selected dates, and completed sessions.
- Daily completed Focus session history.
- Session history persists after refreshing the page.

### Notification Sound Settings
- Enable or disable notification sounds.
- Adjustable sound volume.
- Separate Focus and Play Time notification sounds.
- Sound preview controls.
- Settings persist after refreshing the page.

### Interface
- Chiikawa-inspired visual design.
- Pastel pink Focus theme.
- Mint-green Play Time theme.
- Responsive desktop, tablet, and mobile layouts.
- Reduced-motion accessibility support.

## Technologies

- HTML5
- CSS3
- Vanilla JavaScript (ES Modules)
- Browser localStorage
- Web Audio API

No framework, backend, or database is required.

## Project Structure

```text
little_focus_2/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── calendar.js
│   ├── statistics.js
│   └── storage.js
└── README.md
```

## Run Locally

Because the application uses JavaScript ES modules, run it through a local web server instead of opening `index.html` directly.

1. Open a terminal in the project directory.
2. Start a local server:

```bash
python3 -m http.server 8000
```

3. Open the application in your browser:

```text
http://localhost:8000
```

To stop the server, press `Ctrl + C` in the terminal.

## Data Storage and Privacy

Little Focus stores application data in the browser's localStorage.

Storage key:

```text
littleFocus.appData
```

The current storage schema version is `1`.

Completed Focus sessions and application settings are stored locally in the visitor's browser.

Important notes:

- Data belongs to the browser and device where it was created.
- Data does not automatically synchronize between devices or browsers.
- Clearing browser site data can permanently remove saved sessions and settings.
- The application does not currently use a server or central database.
- Unsupported storage schema versions are protected from accidental overwriting.

Only completed Focus sessions are added to the session history. Paused, reset, and unfinished sessions are not counted.

An in-progress timer is not restored after refreshing the page.

## Settings

Default application settings:

| Setting | Default |
|---|---|
| Focus duration | 25 minutes |
| Play Time duration | 5 minutes |
| Sound enabled | Yes |
| Sound volume | 0.7 |
| Focus notification | Chime |
| Play Time notification | Gentle |

Available notification sounds:

- Chime
- Sparkle
- Gentle

## Deployment

Little Focus is a static web application. It can be hosted using GitHub Pages without a backend.

### Deploy with GitHub Pages

1. Create a new public repository on GitHub, for example, `little-focus`.
2. Upload the project files to the repository.
3. Ensure `index.html` is in the repository root.
4. Open the repository's **Settings**.
5. Select **Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Select the `main` branch and `/ (root)` folder.
8. Save the settings.
9. Wait for GitHub Pages to publish the application.

Your application will be available at:

```text
https://YOUR-USERNAME.github.io/little-focus/
```

Replace `YOUR-USERNAME` with your GitHub username.

After deployment, test the public website on desktop and mobile browsers.

## External Resources

Some decorative GIF embeds and optional Google Fonts require an internet connection.

The timer notification sounds use the browser's Web Audio API.

## Current Limitations

- No user accounts or authentication.
- No cloud synchronization.
- No shared session history between devices.
- Clearing browser storage removes locally saved application data.
- An active or paused timer does not survive a page refresh.

## License

The original source code authored for Little Focus 2.0 by `nanapha-phonn` is licensed under the MIT License, subject to the scope and exclusions stated in the [LICENSE](LICENSE) file.

This license does not cover Chiikawa characters, names, artwork, illustrations, or trademarks; Tenor GIFs or other third-party media; or third-party fonts, libraries, services, and resources. These materials remain subject to their respective owners' rights, licenses, and terms.

The license grants permission to use, modify, and distribute only the original project source code covered by the LICENSE file. It does not grant permission to use or redistribute third-party intellectual property.

## Fan Project Disclaimer

Little Focus 2.0 is an unofficial, non-commercial fan-made productivity project inspired by Chiikawa.

Chiikawa and its associated characters, names, artwork, and trademarks belong to their respective rights holders. This project is not affiliated with, endorsed by, or sponsored by the official Chiikawa creators or rights holders.

Some character GIFs are embedded from Tenor and remain subject to their respective owners' rights and Tenor's terms of service. They are not owned by this project and are not included as redistributable project assets.

The original application code and original design elements are separate from third-party intellectual property. This disclaimer does not grant permission to use copyrighted artwork or trademarks.
