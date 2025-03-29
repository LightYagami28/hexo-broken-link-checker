import BrokenLinkChecker from './core/brokenLinkChecker';

export default function(data) {
  const checker = new BrokenLinkChecker({
    scope: BrokenLinkChecker.RUNNING_SCOPE_FILTER,
  });

  if (!checker.getPluginConfig().enabled) return data;

  checker.processRawData(data);

  return data;
}
