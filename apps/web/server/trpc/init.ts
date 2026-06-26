import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson
});

export const createCallerFactory = t.createCallerFactory;
export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action."
    });
  }

  return next({
    ctx: {
      ...ctx,
      auth: ctx.auth
    }
  });
});
