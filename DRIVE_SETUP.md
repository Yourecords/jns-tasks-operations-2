# Google Drive uploads

Files uploaded through requests, ideas and albums are owned by the connected work account in My Drive. PostgreSQL stores attachment metadata and album records in dedicated tables; binary files are sent to Google Drive. All active signed-in users can view these attachments, consistent with the existing request/idea visibility model. Producers/admins can create albums; team members can contribute album files. For requests and ideas, team members can attach files only to records they created or are assigned to.

## Railway configuration

Reuse GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_URL and NEXTAUTH_SECRET. NEXTAUTH_URL must be the canonical HTTPS website origin. NEXTAUTH_SECRET must be at least 32 characters; it encrypts the refresh token with AES-256-GCM using a purpose-specific derived key. Rotating this secret requires reconnecting Drive. Back up the database and secret securely together.

Required new variables:
- GOOGLE_PICKER_API_KEY: website-restricted key for Google Picker API.
- GOOGLE_DRIVE_FOLDER_ID: the dedicated My Drive folder ID.

Optional:
- GOOGLE_DRIVE_OWNER_EMAIL: defaults to yskvirski@jns.org. The connecting user must also be a website ADMIN.
- GOOGLE_CLOUD_PROJECT_NUMBER: defaults to the numeric prefix of GOOGLE_CLIENT_ID. This is a project number, not the project ID/name.
- GOOGLE_DRIVE_MAX_UPLOAD_MB: defaults to 25, minimum 1 and maximum 100.

Enable Drive API and Picker API in the OAuth client's project. Configure drive.file on the consent screen and keep the audience Internal. Add this redirect URI alongside the existing sign-in callback:

https://www.jns-video.com/api/integrations/google-drive/callback

The picker key must permit https://www.jns-video.com/* and https://docs.google.com/*, and be restricted to Google Picker API. No service account is needed.

## Connect after deployment

1. Sign into the website as the configured storage owner/admin.
2. Open Media & Albums from the sidebar.
3. Click Connect Google Drive and authorize using the storage owner's work account. Accept the Drive permission.
4. Click Select upload folder and choose JNS Website Uploads. Selection is required: adding a folder ID alone does not authorize it under drive.file.
5. Confirm Ready for uploads. Create an album and upload a small JPG. Confirm its thumbnail, original download, and presence in Drive.
6. Open an existing graphics request, equipment request, improvement or show idea, expand Attachments, and upload a file.
7. Verify another active team account can view/download attachments and cannot configure the owner's Drive connection. Test a file over the size limit and a revoked Drive authorization before rollout.

Google consent and the folder picker require the owner to complete these steps interactively. No credentials should be pasted into chat or committed to GitHub. The browser receives an access token only for the owner's authenticated folder selection; the refresh token remains encrypted server-side. Regular upload users never receive the owner's tokens.

## Behavior and limits

- Arbitrary file types can be uploaded/downloaded, within the configured per-file limit. JPEG, PNG, GIF and WebP detected from file signatures have inline previews. Other formats (including SVG, HTML, video, audio and PDF) download as attachments; inline video playback is not implemented.
- Files remain private in Drive; the app proxies authorized viewing/downloads and does not create public links.
- Albums are logical collections in PostgreSQL. All files are stored in the configured Drive folder with unique IDs; duplicate filenames are supported.
- No additional storage quota is created. Files consume the connected account/organization's available Google storage. There is no app-wide capacity meter or total quota in this version.
- There is a basic 100 successful uploads/user/hour threshold. It is not a strict distributed concurrency limiter. Uploads are buffered up to the configured limit; keep 25 MB for a small Railway service and use Dropbox/EditShare for large production footage.
- File/album deletion and synchronization of external Drive changes are not implemented. Removing a parent request makes its attachments unavailable through the app; files remain in Drive for retention. Files moved/deleted in Drive may no longer be available. Reconnecting resets folder selection and preserves existing attachment metadata.
- Tables are initialized lazily on the first media request using CREATE TABLE IF NOT EXISTS. They do not modify the existing application snapshot. Database credentials need CREATE TABLE privileges.
- Live Google OAuth, Picker, upload and download validation must be performed after deployment; automated checks use no real credentials.
