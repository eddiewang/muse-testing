const KNN = require('ml-knn')
const path = require('path')
const csv = require('fast-csv')
const fs = require('fs')

let goodData = []
let badData = []

const fileStream = filename => {
  return fs.createReadStream(path.resolve(__dirname, filename + '.csv'))
}

const streamHandler = stream => {
  return new Promise((resolve, reject) => {
    let resultData = []
    stream
      .pipe(csv())
      .on('data', data => {
        let trigger = false
        data.map(e => {
          if (e === '0' || e === '') {
            trigger = true
          }
        })
        if (!trigger) {
          const formattedData = data.map(d => parseFloat(d))
          resultData.push(formattedData.splice(1, 21))
        }
      })
      .on('end', () => {
        resolve(resultData.splice(1))
      })
  })
}

async function main() {
  const goodFiles = ['post_1', 'post_2', 'post_3', 'post_4', 'post_5', 'post_6']
  const badFiles = ['pre_1', 'pre_2', 'pre_3', 'pre_4', 'pre_5', 'pre_6']

  const testFiles = [
    'KP_hungry_3',
    'KP_hungry_4',
    'KP_hungryNO_3',
    'KP_hungryNO_4',
  ]

  const goodFilesStream = goodFiles.map(e => fileStream(e))
  const badFilesStream = badFiles.map(e => fileStream(e))
  const testFilesStream = testFiles.map(e => fileStream(e))

  const fileDataCleaner = stream => {
    return Promise.all(
      stream.map(async e => {
        const data = await streamHandler(e)
        return data
      })
    )
  }

  const goodFilesData = await fileDataCleaner(goodFilesStream)
  const badFilesData = await fileDataCleaner(badFilesStream)
  const testFilesData = await fileDataCleaner(testFilesStream)

  const splat = s => {
    let resultArr = []
    for (let i = 0; i < s.length; i++) {
      resultArr = [...resultArr, ...s[i]]
    }
    return resultArr
  }

  const goodClean = splat(goodFilesData)
  const badClean = splat(badFilesData)

  const makeArray = (a, i) => Array(a.length).fill(i)

  const trainData = [...goodClean, ...badClean]
  const trainingPoints = [
    ...makeArray(goodClean, 1),
    ...makeArray(badClean, -1),
  ]

  const knn = new KNN(trainData, trainingPoints)
  fs.writeFile('model.json', JSON.stringify(knn.toJSON()), err => {
    console.log('error', err)
  })

  const reduce = a => a.reduce((x, z) => x + z)
  const predict = x => x.map(el => console.log(el) || knn.predict(el))

  const confidence = d => reduce(predict(d)) / d.length

  testFilesData.forEach((t, i) => {
    console.log(`TEST ${i + 1}: `, confidence(testFilesData[i]))
  })
}

main()
