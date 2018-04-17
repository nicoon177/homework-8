import { answerSortTypes } from './';

const setAnswerSort = value => ({
  // TODO: YOUR CODE HERE
  type: answerSortTypes.SET_ANSWER_SORT,
  value,
});

export default { setAnswerSort }