import fs from 'node:fs/promises'

async function main() {
  const danCsv = await fs.readFile('./danbooru.csv', 'utf8')
  const gelCsv = await fs.readFile('./gelbooru.csv', 'utf8')
  const yanCsv = await fs.readFile('./yande.csv', 'utf8')
  const skkCsv = await fs.readFile('./sankakucomplex_chan.csv', 'utf8')
  const allTags = [...new Set(`${skkCsv}\n${gelCsv}\n${danCsv}\n${yanCsv}`.split('\n'))].filter(Boolean).sort().map(e => e.split(','))

  const danJson0 = JSON.parse(await fs.readFile('./danbooru_tags_cn.json', 'utf8'))
  const yanJson = JSON.parse(await fs.readFile('./moebooru_tags_cn.json', 'utf8'))

  const danJson = Object.keys(danJson0).reduce((acc, cur) => {
    acc[cur.replaceAll(' ', '_')] = danJson0[cur]
    return acc
  }, {})

  let results1 = {}
  let results2 = {}
  for (const item of allTags) {
    if (!danJson[item[0]]) {
      results1[item[0]] = item[1]
    }
    if (!yanJson[item[0]]) {
      results2[item[0]] = item[1]
    }
  }

  results1 = {
    ...results1,
    ...danJson,
  }

  results1 = Object.keys(results1).reduce((acc, cur) => {
    acc[cur.replaceAll('_', ' ')] = results1[cur]
    return acc
  }, {})

  results2 = {
    ...results2,
    ...yanJson,
  }

  await fs.writeFile('./all_tags_cn_space.json', JSON.stringify(results1, null, 2))
  await fs.writeFile('./all_tags_cn_space.min.json', JSON.stringify(results1))
  await fs.writeFile('./all_tags_cn.json', JSON.stringify(results2, null, 2))
  await fs.writeFile('./all_tags_cn.min.json', JSON.stringify(results2))
}

main()
