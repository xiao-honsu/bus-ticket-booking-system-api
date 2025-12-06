export default {
  apps: [
    {
      name: 'bus-ticket-booking',
      script: './dist/src/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
