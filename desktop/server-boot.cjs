// Parent-owned local service. A crashed or quit desktop must not leave a service behind.
process.on('disconnect',()=>process.exit(0));
process.once('message', message => {
  process.env.WORKBENCH_ENCRYPTION_KEY=message.key;
  process.env.WORKBENCH_DESKTOP_TOKEN=message.token;
  require('./server/server.js');
});
setTimeout(()=>{if(!process.env.WORKBENCH_DESKTOP_TOKEN)process.exit(1);},10000).unref();
