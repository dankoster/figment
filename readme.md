# Figment

### Figment is a developer tool to inspect rendered React components and find the related sorce code!


Just like the React dev tools, this tool looks at the debug data embedded in a dev build of a React site and presents some of that data as useful information. 

**Most importantly, it lets you inspect the UI to quickly figure out what code is rendering what you see. You can just click the provided link to open the source in VS Code.** 


https://github.com/dankoster/figment/assets/9935523/d72555a0-1849-4c75-8424-01de6b23144f


Unlike the official React Dev Tools, this tool renders elements on the same page it's inspecting. I'm using [custom components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) avoid conflicts and provide isolation between the page and the components rendered by the tool. Mostly this means making use of the [shadow dom](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) to isolate the extension CSS from the page CSS.

# Usage
1) Open a page on localhost that is using a dev build of React (production react will likely be minified and not include source file mappings)
2) Toggle enabled/disabled
   * Use the hotkey `ALT-f` (`⌥-f` on Mac)
   * *OR* click the Figment toolbar icon
3) Mouse over the page to see elements and components highlighted with a red outline
4) Click the red outline label to get the context menu

# Features
* Highlight React components and DOM elements under the mouse
* Click the highlight label to see a menu showing the stack of components under the mouse
* Click a code file link to open it in Visual Studio Code

### TODO
* Display other react info for selected components
   * State
   * Params
   * Hooks
* Configuration options
   * Dark mode
   * Custom hotkey(s)
   * [Custom browser protocols](https://help.autodesk.com/view/SGDEV/ENU/?guid=SGD_ami_custom_browser_protocols_html) for opening files (currently only suppoprts `vscode://file:line:character`)


# Install (for development)
We're keeping it simple here. There are no dependencies except for [git](https://github.com/git-guides/install-git) and [TypeScript](https://www.typescriptlang.org/). We don't have a package manager or build tool. If you have TypeScript and git installed, the following instructions should work great on Mac or Linux: 

1) Clone the repo locally: `git clone https://github.com/dankoster/figment.git`
1) Navigate to the folder that was created by git: `cd figment`
1) Run the terminal command: `mkdir -p dist && cp -rv ./assets/* ./dist && tsc` 
   * `mkdir -p dist` makes the dist folder
   * `cp -rv ./assets/* ./dist` verbosely copies the contents of the assets folder into dist
   * `tsc` compiles the typescript (or use `tsc -w` to watch for changes)
1) Open `chrome://extensions/` in your chromium browser
1) Turn on "Developer Mode"
1) Click the "Load unpacked" button
1) Choose the `figment/dist` folder
1) Find the figment extension in your browser extensions toolbar and pin it
1) Have fun hacking!
   * Use `tsc -w` to watch for changes while working
   * Use `cp -rv ./assets/* ./dist` to copy asset files into dist
