# Figment

### Figment is a developer tool to inspect rendered React components and find the related sorce code!


Just like the React dev tools, this tool looks at the debug data embedded in a dev build of a React site and presents some of that data as useful information. 

**Most importantly, it lets you inspect the UI to quickly figure out what code is rendering what you see. You can just click the provided link to open the source in VS Code.** 

[![demo](https://img.youtube.com/vi/m-nntBWoyMg/0.jpg)](https://www.youtube.com/watch?v=m-nntBWoyMg)

Unlike the official React Dev Tools, this tool renders elements on the same page it's inspecting. I'm using [custom components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) avoid conflicts and provide isolation between the page and the components rendered by the tool. Mostly this means making use of the [shadow dom](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) to isolate the extension CSS from the page CSS.

# Usage
1) Open a page that is using a dev build of React (production react will likely be minified and not include source file mappings)
2) Toggle enabled/disabled
   * Use the hotkey `ALT-f` (`⌥-f` on Mac)
   * OR click the Figment toolbar icon
3) Mouse over the page to see elements and components highlighted with a red outline
4) Click the red outline label to get the context menu

# Features
* Highlight React components and DOM elements under the mouse
* Click the highlight label to see a menu showing the stack of components under the mouse
* Click a code file link to open it in Visual Studio Code

# Install (for development)
We're keeping it simple here, so there's nothing fancy here except for TypeScript. If you have TS installed, the following instructions should work great: 

1) Clone the repo locally: `git clone https://github.com/dankoster/figment.git`
1) run the terminal command: `mkdir -p dist && cp -rv ./assets/* ./dist && tsc` 
   * `mkdir -p dist` makes the dist folder
   * `cp -rv ./assets/* ./dist` verbosely copies the contents of the assets folder
   * `tsc` compiles the typescript (or use `tsc -w` to watch for changes)
1) Open `chrome://extensions/` in your chromium browser
1) Turn on "Developer Mode"
1) Click the "Load unpacked" button
1) Choose the `figment/dist` folder
1) Find the figment extension in your browser extensions toolbar and pin it
