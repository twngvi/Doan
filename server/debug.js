function debugTopics() {
  const ss = SpreadsheetApp.openById('1SWwP0CIdpw050Qq9q4MbZYKkFfGy60t8uMfFZwCF9Ds');
  const sheet = ss.getSheetByName('Topics');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const matchingStatusCol = headers.indexOf('matchingStatus');
  const titleCol = headers.indexOf('title');
  const topicIdCol = headers.indexOf('topicId');
  let result = [];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i][topicIdCol] + ' | ' + data[i][titleCol] + ' | ' + data[i][matchingStatusCol]);
  }
  return result;
}
