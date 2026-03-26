import Pusher from "pusher";
import PusherClient from "pusher-js";

const pusherConfig = {
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
};

const hasServerPusherConfig = Boolean(
  pusherConfig.appId &&
    pusherConfig.key &&
    pusherConfig.secret &&
    pusherConfig.cluster
);

// Server-side Pusher instance
export const pusherServer = hasServerPusherConfig
  ? new Pusher({
      appId: pusherConfig.appId!,
      key: pusherConfig.key!,
      secret: pusherConfig.secret!,
      cluster: pusherConfig.cluster!,
      useTLS: true,
    })
  : ({
      async trigger() {
        console.warn(
          "Pusher config is missing. Skipping trigger; set PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET, and NEXT_PUBLIC_PUSHER_CLUSTER."
        );
        return {} as any;
      },
    } as unknown as Pusher);

// Client-side Pusher instance
export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY || "disabled",
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1",
  }
);
