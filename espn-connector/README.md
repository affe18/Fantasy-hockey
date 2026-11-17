# ESPN connector for Fantasy Hockey Inspection

A Chrome desktop extension (Manifest V3) that imports a league using the ESPN session already active in the browser. It does not ask for an ESPN username or password and does not read, copy, store, or transmit raw session-cookie values.

## Install
1. Download the repository ZIP from GitHub and unzip it.
2. Open `chrome://extensions` in Chrome on your computer.
3. Turn on **Developer mode**.
4. Select **Load unpacked** and choose the `espn-connector` folder.
5. Sign in to ESPN normally in the same Chrome profile and open your Fantasy Hockey league.
6. Open [Fantasy Hockey Inspection](https://fantasy-hockey-bhunda-bros.vercel.app) in a tab.
7. Click the extension icon, enter your numeric ESPN league ID and season, then choose **Connect my ESPN league**.

## Privacy and permissions
After you click Connect, the extension requests ESPN league data through the browser's existing signed-in session using a credentialed browser request. The browser attaches its session automatically; the extension does not inspect or extract cookie values. The imported league data is transferred to the open Fantasy Hockey Inspection tab. If you are signed in to your website account and Supabase has been configured, the website can save the imported league to your account.

The extension only needs access to ESPN Fantasy endpoints and the Fantasy Hockey Inspection production site. You can remove it at any time from `chrome://extensions`.

## Limitations
- Chrome desktop only in this first version; not iPad/Safari.
- ESPN's Fantasy API is unofficial and may change.
- It imports when you click Connect. It does not yet monitor ESPN transactions or refresh scoring automatically in the background.
- Cross-device saving requires the website's Supabase account setup to be completed.
