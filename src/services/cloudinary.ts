interface ENV {
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
}

const getEnvVars = (): ENV => {
  try {
    const env = require('../../.env');
    return {
      CLOUDINARY_CLOUD_NAME: env.CLOUDINARY_CLOUD_NAME || 'dilpgx5x8',
      CLOUDINARY_API_KEY: env.CLOUDINARY_API_KEY || '872294811136374',
      CLOUDINARY_API_SECRET: env.CLOUDINARY_API_SECRET || 'IXihzQP3vPMJjqmXKaqtW7Mi0v8'
    };
  } catch (error) {
    return {
      CLOUDINARY_CLOUD_NAME: 'dilpgx5x8',
      CLOUDINARY_API_KEY: '872294811136374',
      CLOUDINARY_API_SECRET: 'IXihzQP3vPMJjqmXKaqtW7Mi0v8'
    };
  }
};

const { CLOUDINARY_CLOUD_NAME } = getEnvVars();

export const uploadToCloudinary = async (uri: string, folder: string): Promise<string> => {
  try {
    const formData = new FormData();
    const ext = uri.split('.').pop();
    const filename = `${Date.now()}.${ext}`;

    formData.append('file', {
      uri,
      type: `image/${ext}`,
      name: filename
    } as any);
    formData.append('upload_preset', 'ml_default');
    formData.append('folder', folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};
