/**
 * True in the offline file:// build, false in the hosted web build. Replaced with
 * a literal at build time by each Vite config's `define`, so the branch it guards
 * is eliminated rather than evaluated — there is no runtime check anywhere.
 *
 * Only two modules may read it: src/routes/router.tsx picks the router, and
 * src/lib/rfpDocument.ts picks how the document path resolves. Feature code must
 * never see it, and no component may hold a conditional path string.
 */
declare const __OFFLINE__: boolean
