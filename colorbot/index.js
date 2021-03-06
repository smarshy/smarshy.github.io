
const HOSTED_URLS = {
  model:
      'model_js/model.json',
  metadata:
      'model_js/metadata.json'
};

const examples = {
  'example1':
      'light blue',
  'example2':
      'blue',
  'example3':
      'dark blue', 
  'example4':
      'tensorflow orange' 
};

function status(statusText) {
  console.log(statusText);
  document.getElementById('status').textContent = statusText;
}

function color_box(r, g, b) {
  var new_color = "rgb(" + r + "," + g + "," + b + ")";
  console.log("in coloring function");
  document.getElementById('color-me').style.backgroundColor=new_color;
}

function scale(n) {
  return parseInt(n*255.0);
}

function showMetadata(metadataJSON) {
  document.getElementById('vocabularySize').textContent =
      metadataJSON['vocabulary_size'];
  document.getElementById('maxLen').textContent =
      metadataJSON['max_len'];
}

function settextField(text, predict) {
  const textField = document.getElementById('text-entry');
  textField.value = text;
  doPredict(predict);
}

function setPredictFunction(predict) {
  const textField = document.getElementById('text-entry');
  textField.addEventListener('input', () => doPredict(predict));
}

function disableLoadModelButtons() {
  document.getElementById('load-model').style.display = 'none';
}

function doPredict(predict) {
  const textField = document.getElementById('text-entry');
  const result = predict(textField.value);
  score_string = "Predicted RGB: ";
  var r = result.score[0], g = result.score[1], b = result.score[2];
  r = scale(r);
  g = scale(g);
  b = scale(b);
  
  var score_string = "Predicted RGB: ("
  console.log("red: " + r + ", green: " + g + ", blue: " + b);
  status(score_string + r + ',' + g + ',' + b + ') ' + 'Elapsed: ' + result.elapsed.toFixed(4) + ' ms');
      
  color_box(r, g, b);
  console.log("box color should change");
}

function prepUI(predict) {
  setPredictFunction(predict);
  const testExampleSelect = document.getElementById('example-select');
  testExampleSelect.addEventListener('change', () => {
    settextField(examples[testExampleSelect.value], predict);
  });
  settextField(examples['example1'], predict);
}

async function urlExists(url) {
  status('Testing url ' + url);
  try {
    const response = await fetch(url, {method: 'HEAD'});
    return response.ok;
  } catch (err) {
    return false;
  }
}

async function loadHostedPretrainedModel(url) {
  status('Loading pretrained model from ' + url);
  try {
    const model = await tf.loadLayersModel(url);
    status('Done loading pretrained model.');
    disableLoadModelButtons();
    return model;
  } catch (err) {
    console.error(err);
    status('Loading pretrained model failed.');
  }
}

async function loadHostedMetadata(url) {
  status('Loading metadata from ' + url);
  try {
    const metadataJson = await fetch(url);
    const metadata = await metadataJson.json();
    status('Done loading metadata.');
    return metadata;
  } catch (err) {
    console.error(err);
    status('Loading metadata failed.');
  }
}

class Classifier {

  async init(urls) {
    this.urls = urls;
    this.model = await loadHostedPretrainedModel(urls.model);
    await this.loadMetadata();
    return this;
  }

  async loadMetadata() {
    const metadata =
        await loadHostedMetadata(this.urls.metadata);
    showMetadata(metadata);
    this.maxLen = metadata['max_len'];
    console.log('maxLen = ' + this.maxLen);
    this.wordIndex = metadata['word_index']
  }

  predict(text) {
    // Convert to lower case and remove all punctuations.
    const inputText =
        text.trim().toLowerCase().replace(/(\.|\,|\!)/g, '').split('');
    // Look up word indices.
    const inputBuffer = tf.buffer([1, this.maxLen], 'float32');
    //console.log(inputText);
    for (let i = 0; i < inputText.length; ++i) {
      const word = inputText[i];
      //inputBuffer.set(this.wordIndex[word], 0, i);
      inputBuffer.set(this.wordIndex[word], 0, this.maxLen - inputText.length + i);
      //console.log(word, this.wordIndex[word], inputBuffer);
    }
    const input = inputBuffer.toTensor();
    //console.log(input);
    //console.log(input);

    status('Running inference');
    const beginMs = performance.now();
    const predictOut = this.model.predict(input);
    //console.log(predictOut.dataSync());
    console.log("predicted value");
    //console.log(predictOut)
    const score = predictOut.dataSync();//[0];
    console.log(score)
    console.log("score should be printed out")
    predictOut.dispose();
    const endMs = performance.now();

    return {score: score, elapsed: (endMs - beginMs)};
  }
};

async function setup() {
  if (await urlExists(HOSTED_URLS.model)) {
    status('Model available: ' + HOSTED_URLS.model);
    const button = document.getElementById('load-model');
    button.addEventListener('click', async () => {
      const predictor = await new Classifier().init(HOSTED_URLS);
      prepUI(x => predictor.predict(x));
    });
    button.style.display = 'inline-block';
  }

  status('Standing by.');
}

setup();
