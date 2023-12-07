# Figment

### Figment is a developer tool to inspect rendered React components and find the related sorce code!

> This _was_ a project to help me learn react while trying to find code burried in an over-componentized codebase. I am currently adding typescreipt and refactoring everything to take this project from a useful learning experience for me to a useful tool for everyone. Definitely a WIP.

Just like the React dev tools, this tool looks at the debug data embedded in a dev build of a React site and presents some of that data as useful information. 

**Most importantly, it lets you see what is rendering what and you can just click to open the source code for a thing you see rendered on the page.** 

Figma integration needs a lot of work. First, it requires an api key but should use OAuth to let the user just sign in and select a document. Also, there's actually no concrete way to correlate things in Figma with components in your React code without adding explicit links in one place or the other. What the code does now is use the component name to search for similar names within the linked Figma doc. A component named `MainMenu` would correlate to anything in the Figma doc named `MainMenu`, `Main` or `Menu`. This only works as long as your designers and engineers use the same names for things. 

This tool renders elements on the same page it's inspecting. I'm using [custom components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) avoid conflicts and provide isolation between the page and the components rendered by the tool. Mostly this means making use of the [shadow dom](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) to isolate the extension CSS from the page CSS.

# Features
* Highlight React components and DOM elements under the mouse
* Click the highlight label to see a menu showing the tree of components under the mouse and a listing of Figma frames with matching names
* Click a react node name in the menu to search figma for that name
* Click a code file to open it in Visual Studio Code
* Hover over a figma reference to see a preview image 
* Click a Figma reference to open the figma document to that point

# Install (for development)
1) Clone the repo locally: `git clone https://github.com/dankoster/figment.git`
1) run the terminal command: `mkdir -p dist && cp -r ./assets/* ./dist && tsc` 
   * `mkdir -p dist` makes the dist folder
   * `cp -r ./assets/* ./dist` copies the contents of the assets folder
   * `tsc` compiles the typescript (or use `tsc -w` to watch for changes)
1) Open `chrome://extensions/` in your chromium browser
1) Turn on "Developer Mode"
1) Click the "Load unpacked" button
1) Choose the `figment/dist` folder
1) Find the figment extension in your browser extensions toolbar and pin it

### Add a Figma doc (Optional)
7) Open a figma document and get a user token
8) Add the document name, id, and your token in the extesion popup
9) Click "load figma doc"

# TODO
* Configurable source file target (VSCode, VIM, etc)
* Figma OAuth
* Multiple Figma files 
* Better (persistent) caching of figma data (their api is slooooow)
* Assign figma files to a particular site?
* Figma search box (don't require clicking on a node)
* Enable/Disable from context menu or by clicking on extension icon
* Add support for other design tools? (whimsical?, storybook?)
