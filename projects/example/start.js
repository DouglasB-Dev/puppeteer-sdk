import { puppeteerHomeSteps } from './steps/step_1.js';

export default async function start({ body, runSteps }) {
  const url = body.url ?? 'https://pptr.dev/';
  const steps = puppeteerHomeSteps({ url });

  const result = await runSteps(steps, {
    variables: {
      url
    },
    options: {
      captureConsole: true,
      verbose: body.verbose ?? true
    }
  });

  const introText = result.context?.data?.introText ?? null;

  return {
    status: result.success ? 200 : 422,
    body: {
      success: result.success,
      status: result.success ? 'OK' : 'FLOW_FAILED',
      message: result.success
        ? 'Texto capturado correctamente'
        : 'El texto no pudo capturarse',
      data: {
        url,
        introText,
        firstResultTitle: introText
      },
      sdk: result
    }
  };
}
