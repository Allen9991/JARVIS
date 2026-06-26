import { orgRouter } from "./org.router";
import { router } from "../trpc/init";

export const appRouter = router({
  org: orgRouter
});

export type AppRouter = typeof appRouter;
