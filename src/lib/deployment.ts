export type DeploymentMode = 'local' | 'static';

const configuredMode = import.meta.env.VITE_DEPLOYMENT_MODE;

export const deploymentMode: DeploymentMode = configuredMode === 'static' ? 'static' : 'local';
export const isStaticDeployment = deploymentMode === 'static';
