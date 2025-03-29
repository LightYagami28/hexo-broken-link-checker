import commandOptions from './lib/commandOptions';
import commandHandler from './lib/command';
import filterHandler from './lib/filter';

// Registrazione del gestore del comando
hexo.extend.console.register('link_checker', commandOptions.desc, commandOptions, commandHandler);

// Registrazione del gestore del filtro
hexo.extend.filter.register('post', filterHandler);
