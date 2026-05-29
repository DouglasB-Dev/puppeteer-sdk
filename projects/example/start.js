import { googleSearchSteps } from './steps/step_1.js';

export default async function start({ body, runSteps }) {
  const query = body.query ?? 'hola';
  const steps = googleSearchSteps({ query });

  const result = await runSteps(steps, {
    variables: {
      query
    },
    options: {
      captureConsole: true,
      verbose: body.verbose ?? true
    }
  });

  const firstResultTitle = result.context?.data?.firstResultTitle ?? null;

  return {
    status: result.success ? 200 : 422,
    body: {
      success: result.success,
      status: result.success ? 'OK' : 'FLOW_FAILED',
      message: result.success
        ? 'Busqueda ejecutada correctamente'
        : 'La busqueda no pudo completarse',
      data: {
        query,
        firstResultTitle
      },
      sdk: result
    }
  };
}
