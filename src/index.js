import env from "#configs/env";
import server from "#configs/socket";

server.listen(env.PORT, () => {
  console.log(`Server started on PORT ${env.PORT}`);
});
