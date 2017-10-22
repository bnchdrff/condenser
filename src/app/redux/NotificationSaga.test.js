/* eslint no-undef:0 no-unused-vars:0 */
/* global describe, it, before, beforeEach, after, afterEach */

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { call, put, select } from 'redux-saga/effects';
import { Set } from 'immutable';
import { fetchAllNotifications, fetchSomeNotifications } from 'app/utils/YoApiClient';
import {
    fetchAll,
    fetchSome,
    pollNotifications,
    delay,
    getUsernameFromState,
    getNotificationsById,
    processUpdateQueue,
} from './NotificationSaga';

describe('fetchAll', () => {
    it('should get the username from state', () => {
        const gen = fetchAll();

        const withUsername = gen.next().value;
        expect(withUsername).to.deep.equal(select(getUsernameFromState));

        const withPayload = gen.next('basil frankenweiler').value;
        expect(withPayload).to.deep.equal(call(fetchAllNotifications, 'basil frankenweiler'));

        const fetch = gen.next({ data: 'from online' }).value;
        expect(fetch).to.deep.equal(put({ type: 'notification/RECEIVE_ALL', payload: { data: 'from online' } }));

        const done = gen.next();
        expect(done).to.deep.equal({ done: true, value: undefined });
    });
});

describe('fetchSome', () => {
    it('should work with sane defaults', () => {
        const gen = fetchSome({});

        const withUsername = gen.next().value;
        expect(withUsername).to.deep.equal(select(getUsernameFromState));

        const withNotifsNoFilter = gen.next().value;
        expect(withNotifsNoFilter).to.deep.equal(select(getNotificationsById));

        const callFetch = gen.next().value;
        expect(callFetch.CALL.args).to.contain('after');
    });
});

describe('pollNotifications', () => {
    it('should wait a bit, and then poll for notifs', () => {
        const gen = pollNotifications();

        const delayed = gen.next().value.CALL;
        expect(delayed.fn).to.equal(delay);
        expect(delayed.args[0]).to.equal(5000);

        expect(gen.next().value.PUT).to.deep.equal({
            type: 'notification/FETCH_SOME',
            direction: 'after',
        });

        expect(gen.next().done).to.equal(true);
    });

    it('should handle fetch errors', () => {
        const gen = pollNotifications();

        expect(gen.next().value.CALL.fn).to.equal(delay);

        expect(gen.throw({error:true}).value.PUT).to.deep.equal({
            type: 'notification/APPEND_SOME_ERROR',
            msg: 'poll cancelled',
        });

        expect(gen.next().done).to.equal(true);
    });
});

describe('processUpdateQueue', () => {
    it('should process pending updates for a certain queue', () => {
        const queueDescription = {
            accessor: () => '(getIdsShownPending)',
            yoApiCall: () => 'markAsShown',
            sentUpdates: {
                shown: true,
            },
        };

        const gen = processUpdateQueue(queueDescription);

        const callAccessor = gen.next();
        expect(callAccessor.value.SELECT.selector).to.equal(queueDescription.accessor);

        const callYo = gen.next({ count: () => 10 });

        expect(gen.next().done).to.equal(true);
    });
});