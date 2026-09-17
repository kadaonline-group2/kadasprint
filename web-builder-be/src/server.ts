import { app } from "./app";
import { getPort } from "./config/env";

const port = getPort();

app.listen(port, () => {
  process.stdout.write(`Backend listening on port ${port}\n`);
});
