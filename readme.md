# Figment

### Figment is a developer tool to inspect rendered React components and find the related sorce code!


It lets you inspect the UI to quickly figure out what code is rendering what you see. You can just click the provided link to open the source in VS Code.

[Get it from the chrome web store!](https://chromewebstore.google.com/detail/figment/hcmfhihaniplfakhnhpojidjkbnifgde)

https://github.com/dankoster/figment/assets/9935523/d72555a0-1849-4c75-8424-01de6b23144f


This tool has no dependencies. Every bit of functionality was written by me because I learn best by making something I find useful. If you would like a feature that doesn't exist, [just let me know](https://github.com/dankoster/figment/issues/new) and I'll take a look. Or you can submit a PR. 

I'm currently tinkering with a Figma integration to help correlate React components with Figma designs.

# Usage
1) Open a page on localhost that is using a dev build of React or React Native. Production React will likely be minified and not include source file mappings. I am currently limiting this tool (in the manifest) to only function for localhost. 
2) Toggle enabled/disabled
   - Use the hotkey `ALT-f` (`⌥-f` on Mac) (configure here: chrome://extensions/shortcuts)
   - *OR* click the Figment toolbar icon
   - *OR* chose "Toggle DOM Inspection" from the browser context menu
3) Mouse over the page to see elements and components highlighted with a red outline
4) Click the red outline's label to get the context menu

The context menu that pops up will show you the element/component you are inspecting as well as all of it's parent element/components. A link to the source code will be provided for each element/component where React has provided that information. 


# Recent & upcoming work

https://github.com/dankoster/figment/assets/9935523/06e3b9c8-fa9a-45bc-abfa-69e04ef011f8

### Sidepanel stuff
   - [ ] Figma integration (wip)
      - [x] Keep Figma API key in local storage (prompt for key if missing)
      - [x] Load Figma data into local storage when visiting a Figma page
      - [x] Get Figma images
      - [x] Keep Figma data synchronized
      - [x] Drag Figma image onto localhost page
      - [x] Manage local Figma docs (list, add, delete)
      - [x] Separate sidepanel pages for managing and using Figma data
      - [ ] Functionality to link React components to Figma designs
      - [ ] Full text search
      - [ ] Favorites/bookmarks?
      - [ ] Filter Figma data to only show designs relevant to the current page?
   - [ ] CSS styles for everything
   - [x] Sidepanel Header/Tabs
   - [ ] Configuration options sidepanel
     
### Menu stuff
   - [x] Add Submenus
   - [x] Submenu open/close css animations
   - [x] Scroll behavior 
      - Move the menu with the page 
      - Move submenus with their parent menu items when scrolling inside the menu
      - Programmatically adjust menu max-height to avoid scrolling for less than a minimum number of items
   - [x] Submenu positioning 
      - Slide submenus left to prevent overflowing the right side of the page
      - Make submenus appear on the left of their parents if they would overlap the main menu enough to cover other functionality
   - [x] Submenu mouse interaction refinement 
      - allow "shortcutting" over other menu items if the mouse is headed toward an open submenu

### Other
   - [ ] Display other react info for selected components
   - [ ] [Custom browser protocols](https://help.autodesk.com/view/SGDEV/ENU/?guid=SGD_ami_custom_browser_protocols_html) for opening files (currently only suppoprts `vscode://file:line:character`)


# Install (for development)
We're keeping it simple and using just JavaScript, HTML, and CSS. I have intentionally avoided dependencies except for [git](https://github.com/git-guides/install-git) and [TypeScript](https://www.typescriptlang.org/). We really don't need a package manager or build tool for a project of this size. 

1) Clone the repo locally: `git clone https://github.com/dankoster/figment.git`
1) Navigate to the folder that was created by git: `cd figment`
1) Run the terminal command: `mkdir -p dist && cp -rv ./assets/* ./dist && tsc` 
   * `mkdir -p dist` makes the dist folder
   * `cp -rv ./assets/* ./dist` verbosely copies the contents of the assets folder into dist
   * `tsc` compiles the typescript to the dist folder
1) Open `chrome://extensions/` in your chromium browser
1) Turn on "Developer Mode"
1) Click the "Load unpacked" button
1) Choose the `figment/dist` folder
1) Find the figment extension in your browser extensions toolbar and pin it
1) Have fun hacking!
   * Use `tsc -w` to watch for changes while working
   * Use `cp -rv ./assets/* ./dist` to copy asset files into dist (or use the included Deno script to watch and copy those asset files when they change... `deno run --allow-read --allow-write watchAndCopy.ts ./assets ./dist`)
