

export default function run(stack) {
  let results = [];
  stack.forEach((commandContext) => {
    if (commandContext.command.run) {
      results.push(commandContext.command.run(commandContext.context));
    }
  });
  return Promise.all(results);
};
