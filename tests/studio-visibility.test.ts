import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inWorkspace, calendarDate } from '../src/lib/studio-visibility';
test('discarded topic remains recoverable but is not an active topic or sidebar count', () => {
  const item = {kind:'选题池',todoState:'废弃'};
  assert.equal(inWorkspace(item,'选题池'),false);
  assert.equal(inWorkspace({...item,todoState:undefined},'选题池'),true);
});
test('published plan is not a review record', () => {
  assert.equal(inWorkspace({kind:'发布计划'},'数据复盘'),false);
  assert.equal(inWorkspace({kind:'数据复盘'},'数据复盘'),true);
});
test('calendar uses actual publication date, planned date otherwise, and keeps undated items undated', () => {
  assert.equal(calendarDate({status:'已发布',date:'',actualDate:'2026-10-09T17:24'}),'2026-10-09T17:24');
  assert.equal(calendarDate({status:'已发布',date:'2026-10-08',actualDate:'2026-10-09'}),'2026-10-09');
  assert.equal(calendarDate({status:'待手动发布',date:'2026-10-10',actualDate:'2026-10-09'}),'2026-10-10');
  assert.equal(calendarDate({status:'待手动发布',date:''}),'');
});
