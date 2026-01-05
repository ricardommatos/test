import React, { useState } from 'react';
import { createWorker } from 'tesseract.js';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';

const EmojiCounter = () => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [emojiCount, setEmojiCount] = useState(0);
  const [detectedEmojis, setDetectedEmojis] = useState([]);
  const [error, setError] = useState(null);

  const emojiRegex = /[\u{1F300}-\u{1F9FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/gu;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setEmojiCount(0);
      setDetectedEmojis([]);
      setError(null);
    }
  };

  const processImage = async () => {
    if (!image) {
      setError('Please upload an image first');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(imagePreview);
      await worker.terminate();

      const emojis = text.match(emojiRegex) || [];
      const uniqueEmojis = [...new Set(emojis)];

      setEmojiCount(emojis.length);
      setDetectedEmojis(uniqueEmojis);
    } catch (err) {
      setError('Failed to process image: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Emoji Counter
            </h1>
            <p className="text-gray-600">Upload an image and count the emojis!</p>
          </div>

          <div className="space-y-6">
            {/* Upload Section */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
              <label htmlFor="image-upload" className="cursor-pointer block">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      Click to upload an image
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      PNG, JPG, WEBP up to 10MB
                    </p>
                  </div>
                </div>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <ImageIcon className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-700">Preview</h3>
                </div>
                <img
                  src={imagePreview}
                  alt="Uploaded preview"
                  className="max-w-full h-auto max-h-96 mx-auto rounded-lg shadow-md"
                />
              </div>
            )}

            {/* Process Button */}
            {image && (
              <button
                onClick={processImage}
                disabled={processing}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-4 px-6 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Count Emojis</span>
                )}
              </button>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600 text-center">{error}</p>
              </div>
            )}

            {/* Results */}
            {!processing && emojiCount > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                  Results
                </h3>
                <div className="text-center mb-4">
                  <div className="inline-block bg-white rounded-full px-6 py-3 shadow-md">
                    <span className="text-5xl font-bold text-purple-600">
                      {emojiCount}
                    </span>
                    <p className="text-gray-600 mt-2">
                      {emojiCount === 1 ? 'Emoji' : 'Emojis'} Detected
                    </p>
                  </div>
                </div>
                {detectedEmojis.length > 0 && (
                  <div>
                    <p className="text-gray-700 font-medium mb-3 text-center">
                      Unique Emojis Found:
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      {detectedEmojis.map((emoji, index) => (
                        <span
                          key={index}
                          className="text-4xl bg-white p-3 rounded-lg shadow-sm"
                        >
                          {emoji}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!processing && image && emojiCount === 0 && !error && detectedEmojis.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-yellow-700 text-center">
                  No emojis detected in the image. Try uploading an image with visible emojis.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info Footer */}
        <div className="text-center mt-6 text-white">
          <p className="text-sm opacity-90">
            This app uses OCR technology to detect and count emojis in images
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmojiCounter;
