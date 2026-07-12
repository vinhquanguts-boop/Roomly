export function assertLocalOnlyConfiguration(): void {
  if (process.env.ROOMLY_LOCAL_ONLY !== 'true') {
    return;
  }

  const aiMode = process.env.AI_MODE ?? 'local';
  const renderMode = process.env.RENDER_MODE ?? 'plan-only';

  if (aiMode !== 'local') {
    throw new Error('ROOMLY_LOCAL_ONLY=true requires AI_MODE=local.');
  }

  if (renderMode !== 'plan-only') {
    throw new Error('ROOMLY_LOCAL_ONLY=true requires RENDER_MODE=plan-only.');
  }
}
