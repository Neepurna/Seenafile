import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '@env';

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
