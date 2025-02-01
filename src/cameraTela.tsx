import { useCameraPermissions, Camera, CameraView } from 'expo-camera'; // Importa funcionalidades da câmera do Expo
import { Ionicons, FontAwesome, AntDesign, Fontisto, MaterialIcons } from '@expo/vector-icons'; // Importa ícones
import { Children, useRef, useState } from 'react'; // Importa funções do React
import { Button, Text, TouchableOpacity, View, StyleSheet, SafeAreaView, Modal, Image, Alert } from 'react-native'; // Importa componentes do React Native
import { useNavigation } from "@react-navigation/native"; // Importa a função de navegação
import { styles } from './estilos/estilo'; // Importa estilos customizados
import * as MediaLibrary from 'expo-media-library'; // Importa funcionalidades para gerenciar a biblioteca de mídia
import { Botao } from "./componentes/Botao"; // Importa componente de botão customizado
import { NativeBaseProvider, Slider } from 'native-base'; // Importa componentes da biblioteca NativeBase
import { PermissionsAndroid } from 'react-native'; // Importa funcionalidades para gerenciar permissões
import * as Permissions from 'expo-permissions'; // Importa funcionalidades para gerenciar permissões do Expo
import * as ImageManipulator from 'expo-image-manipulator'; // Importa funcionalidades para manipular imagens
import { useRoute } from '@react-navigation/native'; // Importa a função para acessar a rota
import * as FaceDetector from 'expo-face-detector'; // Importa funcionalidades para detecção de faces

export default function CameraTela({ navigation }) {
  // Define estados da tela
  const [facing, setFacing] = useState('back'); // Define se a câmera está na frente ou atrás
  const [permission, requestPermission] = useCameraPermissions(); // Define permissões da câmera
  const [flash, setFlash] = useState('off'); // Define o flash da câmera
  const camRef = useRef(null); // Referência para a câmera
  const [capturedPhoto, setCapturedPhoto] = useState(null); // Armazena a imagem capturada
  const [mirrored, setMirrored] = useState(false); // Define se a imagem é espelhada
  const [open, setOpen] = useState(false); // Define se o modal está aberto
  const navigationn = useNavigation(); // Define a navegação
  const [zoom, setZoom] = useState(0); // Define o zoom da câmera
  const [originalPhoto, setOriginalPhoto] = useState(null); // Armazena a imagem original capturada
  const [savedZoom, setSavedZoom] = useState(0); // Define o zoom salvo
  const route = useRoute(); // Define a rota atual
  const [markedPhoto, setMarkedPhoto] = useState(null); // Define a imagem com a marcação de rosto
  const [zoomLevel, setZoomLevel] = useState(0); // Define o nível de zoom 

  // Função para renderizar a sobreposição de grade na câmera
  const GridOverlay = () => {
    return (
      <View style={styles.gridContainer}>
        {/* Define a grade da câmera */}
        <View style={[styles.corner, styles.topLeftCorner]} />
        <View style={[styles.corner, styles.topRightCorner]} />
        <View style={[styles.corner, styles.bottomLeftCorner]} />
        <View style={[styles.corner, styles.bottomRightCorner]} />
        <View style={styles.gridLineVertical} />
        <View style={styles.gridLineHorizontal} />
        <View style={styles.centralRectangle} />
      </View>
    );
  };

  // Verifica as permissões da câmera
  if (!permission) {
    return <View />;
  }
  if (!permission.granted) {
    // Se as permissões não foram concedidas, solicita a permissão
    return (
      <View style={styles.centeredView}>
        <Text style={styles.permissionText}>
          Precisamos da sua permissão para acessar a Câmera
        </Text>
        <Button onPress={requestPermission} title="Conceder Permissão" />
      </View>
    );
  }

  // Função para solicitar permissões de câmera
  async function requestPermissions() {
    const { status, permissions } = await Permissions.requestCameraPermissionsAsync();
    if (status === 'granted') {
      console.log('Permissões concedidas!');
    } else {
      console.log('Permissões negadas.');
    }
  }

  // Chama a função para solicitar permissões quando o aplicativo iniciar
  requestPermissions(); 

  // Função para capturar a imagem
  async function takePicture() {
    if (camRef.current) {
      // Captura a imagem com a câmera
      const data = await camRef.current.takePictureAsync(); 
      // Salva a imagem na galeria
      const asset = await MediaLibrary.createAssetAsync(data.uri);

      setOriginalPhoto(data.uri); // Salva a URI da imagem original
      setCapturedPhoto(data.uri); // Salva a URI da imagem capturada
      setSavedZoom(0); // Define o zoom salvo como 0
      setOpen(true); // Abre o modal
    }
  }

  // Função para detectar rostos na imagem capturada
  async function detectFaces(photoUri) {
    const options = {
      mode: FaceDetector.FaceDetectorMode.fast,
      detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
      runClassifications: FaceDetector.FaceDetectorClassifications.none,
    };
  
    try {
      const { faces } = await FaceDetector.detectFacesAsync(photoUri, options);
  
      if (faces.length > 0) {
        const markedImage = await markFaces(photoUri, faces);
        setMarkedPhoto(markedImage);
        setOpen(true); // 🔥 Agora o modal só será aberto se um rosto for detectado
      } else {
        Alert.alert("Nenhum rosto detectado", "Por favor, tire uma nova foto.");
        setMarkedPhoto(null); // Garante que a imagem processada não será usada
        setOpen(false); // 🔥 Garante que o modal não será aberto sem rostos
      }
    } catch (error) {
      console.error("Erro na detecção de faces:", error);
      Alert.alert("Erro na Detecção de Rostos", error.message);
      setOpen(false); // 🔥 Fecha o modal em caso de erro
    }
  }

  // Função para marcar rostos na imagem
  const markFaces = async (uri, faces) => {
    let currentUri = uri;
    for (const face of faces) {
      const cropAction = {
        crop: {
          originX: face.bounds.origin.x,
          originY: face.bounds.origin.y,
          width: face.bounds.size.width,
          height: face.bounds.size.height,
        },
      };
      const manipulated = await ImageManipulator.manipulateAsync(currentUri, [cropAction], { compress: 1, format: ImageManipulator.SaveFormat.PNG });
      currentUri = manipulated.uri;
    }
    return currentUri;
  };

  // Função para realizar cálculos com base no zoom (não implementado)
  function someCalculationBasedOnZoom(zoomLevel, imageSize) {
    const zoomFactor = 1 - zoomLevel; 
    const width = imageSize * zoomFactor;
    const height = imageSize * zoomFactor;
    return { width, height };
  }

  // Função para salvar a imagem capturada
  async function savePicture() {
    if (markedPhoto) { 
      let imageUri = markedPhoto; // Use markedPhoto aqui
      let actions = [];
  
      if (facing === 'front') {
        actions.push({ flip: ImageManipulator.FlipType.Horizontal });
      }
     
      // Se o zoom foi aplicado na câmera, você pode removê-lo aqui
      // if (zoom !== 0) {
      //   const { width, height } = someCalculationBasedOnZoom(zoom, 1080);
      //   actions.push({ crop: { originX: 0, originY: 0, width, height } });
      // }
  
      // Aplique as ações se necessário
      if (actions.length > 0) {
        const manipulated = await ImageManipulator.manipulateAsync(
          imageUri,
          actions,
          { compress: 1, format: ImageManipulator.SaveFormat.PNG }
        );
        imageUri = manipulated.uri;
      }
  
      // Salva a imagem na galeria
      const asset = await MediaLibrary.createAssetAsync(imageUri);
      // Cria um álbum para as fotos salvas
      await MediaLibrary.createAlbumAsync("Saved Photos", asset, false);
      // Exibe um alerta de sucesso
      Alert.alert("Sucesso", "Foto salva com sucesso!");
      navigation.navigate('MinhasCapturas', { newImage: asset });
    }
  }

  // Função para atualizar a galeria (não implementado)
  function updateGallery(newAsset) {
    setImages(currentImages => [...currentImages, newAsset]);
  }

  // Função para alternar a câmera entre a frontal e a traseira
  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
    setMirrored(current => !current);
  }

  // Função para alternar o flash da câmera
  function toggleFlash() {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  }

  // Função para fechar a câmera e voltar para a tela inicial
  function closeCamera() {
    navigation.navigate('TelaInicial');
  }

  // Funções para aumentar e diminuir o zoom
  function increaseZoom() {
    setZoom(prevZoom => Math.min(prevZoom + 0.1, 1));
    setSavedZoom(zoom); 
  }

  function decreaseZoom() {
    setZoom(prevZoom => Math.max(prevZoom - 0.1, 0));
    setSavedZoom(zoom); 
  }

  return (
    <NativeBaseProvider> 
      {/* Define o provedor da biblioteca NativeBase */}
      <SafeAreaView style={styles.container}> 
        {/* Define o SafeAreaView para gerenciar o espaço do sistema */}
        <View style={styles.container}>
          <CameraView style={styles.camera} facing={facing} flash={flash} ref={camRef} mirrored={mirrored} zoom={zoom}>
            <GridOverlay />
          </CameraView>
          {/* Exibe a câmera com a grade */}
        </View>

        <View style={styles.controlsTop}>
          {/* Define os controles superiores da câmera */}
          <TouchableOpacity onPress={() => navigation.navigate('TelaInicial')} style={styles.closeButton}>
            <Ionicons name="close-outline" size={30} color="white" />
          </TouchableOpacity>
          {/* Botão para fechar a câmera */}

          <TouchableOpacity onPress={toggleFlash} style={styles.flashButton}>
            <Ionicons name={flash === 'off' ? 'flash-off-outline' : 'flash-outline'} size={30} color="white" />
          </TouchableOpacity>
          {/* Botão para alternar o flash */}
        </View>

        <View style={styles.zoomControls}>
          {/* Define os controles de zoom */}
          <TouchableOpacity onPress={increaseZoom} style={styles.zoomButtonPlus}>
            <Ionicons name="add" size={30} color="white" />
          </TouchableOpacity> 
          {/* Botão para aumentar o zoom */}

          <Fontisto name="zoom" size={15} color="white" style={{ marginTop: 20 }} />
          {/* Ícone de zoom */}

          <TouchableOpacity onPress={decreaseZoom} style={styles.zoomButtonMinus}>
            <Ionicons name="remove" size={30} color="white" />
          </TouchableOpacity> 
          {/* Botão para diminuir o zoom */}
        </View>


        <View style={styles.controls}>
          {/* Define os controles inferiores da câmera */}
          <TouchableOpacity onPress={() => navigation.navigate('MinhasCapturas')}>
            <AntDesign name="picture" size={30} color="white" />
          </TouchableOpacity> 
          {/* Botão para visualizar as fotos salvas */}

          <View style={styles.captureButtonContainer}>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <Ionicons name="camera-outline" size={30} color="white" />
            </TouchableOpacity> 
            {/* Botão para capturar a foto */}
          </View>

          <TouchableOpacity onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}>
            <Ionicons name="camera-reverse-outline" size={30} color="white" />
          </TouchableOpacity> 
          {/* Botão para alternar a câmera */}
        </View>

        {/* Modal para exibir a imagem capturada */}
        <Modal animationType="slide" transparent={false} visible={open}>
          <View style={styles.modalContent}>
            <Image
              style={styles.modalImage}
              source={{ uri: capturedPhoto }} // Exibe a imagem capturada no modal
              style={[styles.modalImage, facing === 'front' && { transform: [{ scaleX: -1 }] }]}
            />
            {/* Exibe a imagem com espelho se a câmera frontal estiver ativa */}

            <Botao mt={10} mb={1} children={"Descartar"} onPress={() => setOpen(false)} />
            {/* Botão para descartar a imagem */}

            <Botao mt={1} mb={1} children={"Detectar Faces"} onPress={() => detectFaces(capturedPhoto)} />
            {/* Botão para detectar rostos na imagem */}
          </View>
        </Modal>

        {/* Modal para exibir a imagem com a marcação de rosto */}
        {markedPhoto && (
          <Modal animationType="slide" transparent={false} visible={true}>
            <View style={styles.modalContent}>
              <Image
                style={[styles.modalImage, facing === 'front' && { transform: [{ scaleX: -1 }] }]}
                source={{ uri: markedPhoto }}
              />
              {/* Exibe a imagem com espelho se a câmera frontal estiver ativa */}

              {markedPhoto ? (
                <Text style={styles.faceDetected}>Rosto Detectado!</Text>
              ) : (
                <Text style={styles.noFaces}>Nenhum rosto detectado.</Text>
              )}
              {/* Exibe mensagem indicando se rosto foi detectado */}

              <Botao mt={10} mb={1} children="Salvar" onPress={savePicture} />
              {/* Botão para salvar a imagem */}
              <Botao mt={1} mb={1} children="Descartar" onPress={() => setMarkedPhoto(null)} />
              {/* Botão para descartar a imagem */}
              <Botao mt={1} mb={1} children="Visualizar Capturas" onPress={() => navigation.navigate('MinhasCapturas')} />
              {/* Botão para visualizar as fotos salvas */}
            </View>
          </Modal>
        )}

      </SafeAreaView>
    </NativeBaseProvider>
  );
}