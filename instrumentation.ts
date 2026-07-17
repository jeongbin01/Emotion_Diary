export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    import('@/app/lib/inferServer').then(({ warmUpInferServer }) => warmUpInferServer())
  }
}
