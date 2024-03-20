import { debounce } from "https://deno.land/std@0.220.1/async/debounce.ts";

const dirToWatch = Deno.args[0];
const dirToCopyTo = Deno.args[1];
const watcher = Deno.watchFs(dirToWatch, { recursive: false });
const handleFileEvent = debounce((event: Deno.FsEvent) => {
    for(const path of event.paths) {
        switch(event.kind) {
            case 'modify': {
                const fileName = path.substring(path.lastIndexOf('/') + 1)
                const destPath = [dirToCopyTo, fileName].join('/')
                console.log('copy file', path, 'to', destPath)
                Deno.copyFile(path, destPath)
                break;
            }
            default:
                console.log('unhandled event', event.kind, path)
            break;
        }
      }
      }, 200);
  
for await (const event of watcher) {
    handleFileEvent(event)
}