const removeAnsiColors = (str) => {
  const colors = {
    '0;31': '{r',
    '1;31': '{R',
    '0;32': '{g',
    '1;32': '{G',
    '0;33': '{y',
    '1;33': '{Y',
    '0;34': '{b',
    '1;34': '{B',
    '0;35': '{m',
    '1;35': '{M',
    '0;36': '{c',
    '1;36': '{C',
    '0;37': '{w',
    '1;37': '{W',
    '1;30': '{*',
    '0': '{x'
  };

  return str.replace(/\033\[[0-9;]*m/g, '');
};

export default removeAnsiColors;
