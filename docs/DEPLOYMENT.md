# Browser Deployment

The project is designed to run as a static website.

## GitHub Pages

`.github/workflows/pages.yml` deploys the repository contents whenever `main` is updated.

If GitHub Pages has not been enabled for this repository yet, enable Pages with GitHub Actions as the source in the repository settings. After the workflow succeeds, the game will be available from the repository's GitHub Pages URL.

## Local browser testing

Do not open `index.html` with a `file://` URL. Serve the repository directory through a local HTTP server.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
