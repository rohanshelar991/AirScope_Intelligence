const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

const intervalMinutes = Number(process.env.PIPELINE_INTERVAL_MINUTES || 15);
const schedule = `*/${intervalMinutes} * * * *`;
const pipelineScript = path.join(__dirname, 'environmentPipeline.js');

function runPipeline() {
  const child = spawn(process.execPath, [pipelineScript], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Scheduled pipeline run exited with code ${code}.`);
    }
  });
}

console.log(`Environmental pipeline scheduler started. Running every ${intervalMinutes} minute(s).`);
runPipeline();

cron.schedule(schedule, () => {
  console.log(`Triggering scheduled run at ${new Date().toISOString()}`);
  runPipeline();
});
