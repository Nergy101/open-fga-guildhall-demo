import { App, staticFiles } from "fresh";
import { type State } from "./utils.ts";

export const app = new App<State>();

app.use(staticFiles());

// File-system based routes (routes/*) handle everything, including the
// persona middleware in routes/_middleware.ts.
app.fsRoutes();
