import React, { useState, useEffect } from 'react';
import { View, Text, Image, Modal, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Botao } from "./componentes/Botao";
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FaceDetector from 'expo-face-detector';
import * as MediaLibrary from 'expo-media-library';

export default function DetectFaces() {
  const [markedPhoto, setMarkedPhoto] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasFaces, setHasFaces] = useState(false); // ✅ FLAG para controlar se há rostos detectados

  const route = useRoute();
  const navigation = useNavigation();
  const photoUri = route.params?.photoUri;
  const isFrontCamera = route.params?.isFrontCamera;
  const zoom = route.params?.zoom || 0;

  useEffect(() => {
    let isMounted = true;

    const detectFaces = async () => {
      if (!photoUri || !isMounted) return;

      try {
        setLoading(true);

        // Verificar permissões da galeria
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted' && isMounted) {
          Alert.alert("Permissão necessária", "Acesso à galeria negado.");
          setLoading(false);
          navigation.navigate('CameraTela');
          return;
        }

        // Configuração do detector facial
        const options = {
          mode: FaceDetector.FaceDetectorMode.fast,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
          runClassifications: FaceDetector.FaceDetectorClassifications.none,
        };

        // Detecção de rostos
        const { faces } = await FaceDetector.detectFacesAsync(photoUri, options);

        if (!isMounted) return;

        if (faces.length === 0) {
          setHasFaces(false); // ❌ Não há rostos, então impede a abertura do modal
          setLoading(false);

          await new Promise(resolve => {
            Alert.alert(
              "Nenhum rosto detectado",
              "Por favor, tire uma nova foto.",
              [{ text: "OK", onPress: resolve }]
            );
          });

          navigation.navigate('CameraTela'); // 🔥 Só navega após o alerta ser fechado
          return;
        }

        // ✅ Se há rostos, processamos a imagem e abrimos o modal
        const processedImage = await markFaces(photoUri, faces);
        if (isMounted) {
          setMarkedPhoto(processedImage);
          setHasFaces(true); // ✅ Indica que há rostos na imagem
          setOpen(true);
        }

        if (isMounted) setLoading(false);

      } catch (error) {
        if (isMounted) {
          Alert.alert("Erro", "Falha no processamento da imagem");
          setLoading(false);
          navigation.navigate('CameraTela');
        }
      }
    };

    detectFaces();

    return () => { isMounted = false };
  }, [photoUri, navigation]);

  const markFaces = async (uri, faces) => {
    try {
      const actions = faces.map(face => ({
        crop: {
          originX: face.bounds.origin.x,
          originY: face.bounds.origin.y,
          width: face.bounds.size.width,
          height: face.bounds.size.height
        }
      }));

      const result = await ImageManipulator.manipulateAsync(
        uri,
        actions,
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );

      return result.uri;
    } catch (error) {
      console.error("Erro no processamento:", error);
      return uri;
    }
  };

  const savePicture = async () => {
    if (!markedPhoto) return;

    try {
      let finalImage = markedPhoto;
      const manipulations = [];

      // Aplicar flip para fotos da câmera frontal
      if (isFrontCamera) {
        manipulations.push({ flip: ImageManipulator.FlipType.Horizontal });
      }

      // Aplicar zoom se necessário
      if (zoom !== 0) {
        const { width, height } = calculateZoom(zoom, 1080);
        manipulations.push({ crop: { originX: 0, originY: 0, width, height } });
      }

      // Processar manipulações
      if (manipulations.length > 0) {
        const { uri } = await ImageManipulator.manipulateAsync(
          finalImage,
          manipulations,
          { compress: 1, format: ImageManipulator.SaveFormat.PNG }
        );
        finalImage = uri;
      }

      // Salvar na galeria
      const asset = await MediaLibrary.createAssetAsync(finalImage);
      await MediaLibrary.createAlbumAsync("Fotos Salvas", asset, false);
      
      Alert.alert("Sucesso!", "Foto salva na galeria");
      navigation.navigate('MinhasCapturas', { newImage: asset });

    } catch (error) {
      Alert.alert("Erro", "Falha ao salvar a foto");
      console.error("Erro ao salvar:", error);
    }
  };

  const calculateZoom = (zoomLevel, baseSize) => ({
    width: baseSize * (1 - zoomLevel),
    height: baseSize * (1 - zoomLevel)
  });

  const handleDiscard = () => {
    setOpen(false);
    navigation.replace('CameraTela');
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2d5576" />
          <Text style={styles.loadingText}>Analisando imagem...</Text>
        </View>
      ) : (
        <Modal
          visible={open && hasFaces} // 🔥 Só exibe o modal se houver rostos
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <View style={styles.modalContent}>
            {markedPhoto ? (
              <Image
                source={{ uri: markedPhoto }}
                style={[
                  styles.previewImage,
                  isFrontCamera && { transform: [{ scaleX: -1 }] }
                ]}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.errorText}>Erro ao carregar a imagem</Text>
            )}

            <View style={styles.buttonGroup}>
              <Botao style={styles.button} onPress={savePicture}>
                Salvar Foto
              </Botao>
              
              <Botao style={styles.button} onPress={handleDiscard}>
                Nova Foto
              </Botao>
              
              <Botao 
                style={styles.button}
                onPress={() => navigation.navigate('MinhasCapturas')}
              >
                Ver Capturas
              </Botao>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}