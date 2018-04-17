import { compose, withStateHandlers, withHandlers, lifecycle, branch, renderComponent, withProps } from 'recompose';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import * as R from 'ramda';
import { db } from '../../utils';

import AppLoader from '../Loaders/AppLoader';
import Component from './Component';

const DIRECTION = {
  createdAt: R.descend,
  best: R.descend,
  worst: R.descend,
};

const SORT_BY = {
  createdAt: 'createdAt',
  best: 'positive',
  worst: 'negative',
};

const votesByAnswerId = (votes, answerId) => votes.filter(vote => vote.answerId === answerId)

const divideVotes = votes => {
  const positive = votes.filter(vote => vote.isPositive).length;
  const negative = votes.length - positive;
  return { positive, negative };
};

const divideByAnswerId = (votes, answerId) => divideVotes(votesByAnswerId(votes, answerId));

const sortWith = sortBy => R.sortWith([DIRECTION[sortBy](R.prop(SORT_BY[sortBy]))]);

const prepareAnswers = ({ answers, votes, sortBy }) => {
  const answerWithVotes = answers.map(answer => ({
    ...answer,
    ...divideByAnswerId(votes, answer._id),
  }));
  return sortWith(sortBy)(answerWithVotes);
};

const mapStateToProps = state => ({
  user: state.user,
  sortBy: state.answerSort,
});

const enhance = compose(
  connect(mapStateToProps),
  withStateHandlers({ answers: [], users: [], votes: [], isFetching: true }),

  withRouter,

  lifecycle({
    componentWillMount() {
      this.interval = db.pooling(async () => {
        const questionId = this.props.match.params.questionId;

        let answers = await db.answers.find();
        answers = answers.filter(answer => answer.questionId === questionId);

        let votes = await db.votes.find();
        const answerIds = answers.map(a => a._id);
        votes = votes.filter(vote => answerIds.includes(vote.answerId));

        const users = await db.users.find();

        this.setState({ answers, votes, users, isFetching: false });
      });
    },
    componentWillUnmount() {
      clearInterval(this.interval);
    }
  }),

  branch(
    ({ isFetching }) => isFetching,
    renderComponent(AppLoader)
  ),

  withHandlers({
    onVote: ({ user }) => (answerId, isPositive) => {
      if (user) {
        db.votes.insert({
          answerId,
          isPositive,
          createdAt: new Date(),
          createdById: user._id,
        });
      }
    }
  }),
  withProps(props => ({ answers: prepareAnswers(props) })),
);


export default enhance(Component);
