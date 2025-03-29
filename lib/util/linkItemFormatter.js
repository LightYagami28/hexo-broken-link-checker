import colors from 'colors';
import moment from 'moment';

export default function(item) {
  let itemStatus;
  let itemLastCheck;
  let itemLinkText;

  if (!item.lastChecked) {
    itemStatus = 'Unverified'.yellow;
  } else if (item.lastChecked && item.success) {
    itemStatus = 'Ok'.green;
  } else {
    itemStatus = 'Broken'.red;
  }

  itemLastCheck = item.lastChecked
      ? moment(item.lastChecked).format('YYYY-MM-DD HH:mm:ss')
      : 'Never';

  switch (item.link.type) {
    case 'Text':
      itemLinkText = item.link.label;
      break;
    case 'Image':
    case 'YouTube':
      itemLinkText = item.link.type;
      break;
    default:
      itemLinkText = 'Unknown';
  }

  item.lastChecked = itemLastCheck;
  item.status = itemStatus;
  item.link.text = itemLinkText;

  return item;
}
