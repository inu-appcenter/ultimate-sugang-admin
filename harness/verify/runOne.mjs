/** 검증 스크립트 하나를 돌리고 결과를 판정한다. run.mjs 가 프로세스마다 부른다. */
const target = process.argv[2];
const module = await import(target);
const result = module.default;

if (result === undefined || typeof result.failures !== 'number') {
  console.error(`\n${target} 이 { total, failures } 를 default export 하지 않는다.`);
  process.exit(1);
}

console.log(
  `\n${result.failures === 0 ? `전부 통과 (${result.total}건)` : `${result.failures}/${result.total}건 실패`}`,
);
process.exit(result.failures === 0 ? 0 : 1);
