export default ({ config }) => {
  return {
    ...config,
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
    },
  };
};
