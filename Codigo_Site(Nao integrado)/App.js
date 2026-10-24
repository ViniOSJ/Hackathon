

import React, { useState, useRef } from "react";

import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";

import { CameraView, useCameraPermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";

const API_BASE_URL = "http://localhost:8080"; // Troque pelo IP/URL onde o backend Spring Boot está acessível.

const C = {
  green: "#183B32",
  lime: "#C9F17A",
  bg: "#F7F9F6",
  white: "#FFFFFF",
  text: "#1D2923",
  muted: "#68766D",
  border: "#E2E8E1",
  soft: "#EDF3E9",
};

function Button({ title, onPress, secondary = false }) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        secondary && styles.secondaryButton,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && styles.secondaryText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function Logo() {
  return (
    <View style={styles.logoContainer}>
      <View style={styles.logoBox}>
        <Text style={styles.logoSymbol}>↗</Text>
      </View>
      <Text style={styles.logoName}>Antecipe</Text>
      <Text style={styles.logoCaption}>
        FINANÇAS INTELIGENTES
      </Text>
    </View>
  );
}

// Extrai uma tag XML simples.
function getTag(xml, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    "<" + escaped + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + escaped + ">",
    "i"
  );

  const match = xml.match(regex);

  return match
    ? match[1].replace(/<[^>]*>/g, "").trim()
    : "";
}

// Extrai uma tag de dentro de uma seção específica.
function getSectionTag(xml, section, tagName) {
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    "<" + escaped + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + escaped + ">",
    "i"
  );

  const match = xml.match(regex);
  return match ? getTag(match[1], tagName) : "";
}

function parseXML(xml) {
  const valor = getTag(xml, "vNF");

  return {
    numero: getTag(xml, "nNF"),
    emissor:
      getSectionTag(xml, "emit", "xNome") ||
      getSectionTag(xml, "emit", "CNPJ"),
    sacado:
      getSectionTag(xml, "dest", "xNome") ||
      getSectionTag(xml, "dest", "CNPJ"),
    emissao: getTag(xml, "dhEmi") || getTag(xml, "dEmi"),
    vencimento: getTag(xml, "dVenc"),
    valor,
  };
}

function formatDate(value) {
  if (!value) return "Não informado";

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  return value;
}

function formatMoney(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return "Não informado";
  }

  const normalized = String(value).trim().replace(",", ".");
  const number = Number(normalized);

  if (!Number.isFinite(number)) return String(value);

  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function App() {
  const [screen, setScreen] = useState("home");

  // Guarda o caminho percorrido pelo usuário.
  const [history, setHistory] = useState([]);

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estado da integração com a API Spring Boot.
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [apiResults, setApiResults] = useState([]);

  const cameraRef = useRef(null);

  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState(null);

  const [invoice, setInvoice] = useState({
    numero: "",
    emissor: "",
    sacado: "",
    emissao: "",
    vencimento: "",
    valor: "",
  });

  // Navega para outra tela e registra a tela atual.
  function navigateTo(nextScreen) {
    if (nextScreen === screen) return;

    setHistory((previous) => [...previous, screen]);
    setScreen(nextScreen);
  }

  // Troca de tela sem adicionar uma nova etapa ao histórico.
  function replaceScreen(nextScreen) {
    setScreen(nextScreen);
  }

  // Retorna à tela visitada anteriormente.
  function goBack() {
    if (history.length > 0) {
      const previousScreen = history[history.length - 1];

      setHistory((previous) => previous.slice(0, -1));
      setScreen(previousScreen);
    } else {
      setScreen("home");
    }

    setCameraReady(false);
    setLoading(false);
  }

  function resetInvoice() {
    setInvoice({
      numero: "",
      emissor: "",
      sacado: "",
      emissao: "",
      vencimento: "",
      valor: "",
    });
  }

  function openNote(note) {
    setCurrentNote(note);
    setInvoice({ ...note.invoice });
    navigateTo("detail");
  }

  function addNote(file, photo = null, data = null, fromCamera = false) {
    const newNote = {
      id: String(Date.now()),
      file,
      photo,
      invoice: data || {
        numero: "",
        emissor: "",
        sacado: "",
        emissao: "",
        vencimento: "",
        valor: "",
      },
      status: "Aguardando configuração",
    };

    setNotes((previous) => [newNote, ...previous]);
    setCurrentNote(newNote);
    setInvoice({ ...newNote.invoice });

    // Após fotografar, substitui a câmera pela tela de detalhes.
    // Assim, o botão Voltar retorna ao menu anterior.
    if (fromCamera) {
      replaceScreen("detail");
    } else {
      navigateTo("detail");
    }
  }

  async function chooseFile(type) {
    try {
      const mimeTypes = {
        image: ["image/jpeg", "image/png", "image/webp"],
        pdf: ["application/pdf"],
        xml: [
          "text/xml",
          "application/xml",
          "text/plain",
          "application/octet-stream",
        ],
      };

      const result = await DocumentPicker.getDocumentAsync({
        type: mimeTypes[type],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const selected = result.assets[0];
      let extractedData = null;

      if (type === "xml") {
        try {
          const response = await fetch(selected.uri);
          const content = await response.text();
          extractedData = parseXML(content);
        } catch (error) {
          Alert.alert(
            "XML selecionado",
            "Não foi possível ler o conteúdo automaticamente. Você poderá preencher os dados manualmente."
          );
        }
      }

      const file = {
        uri: selected.uri,
        name: selected.name || "documento",
        mimeType: selected.mimeType || "",
        size: selected.size || 0,
        type,
      };

      addNote(
        file,
        type === "image" ? selected.uri : null,
        extractedData
      );
    } catch (error) {
      Alert.alert("Erro", "Não foi possível selecionar o arquivo.");
    }
  }

  async function openCamera() {
    if (Platform.OS === "web") {
      Alert.alert(
        "Câmera",
        "Para testar a câmera, utilize um dispositivo compatível com Expo Go. No navegador, você pode selecionar uma imagem."
      );
      return;
    }

    try {
      if (!permission?.granted) {
        const result = await requestPermission();

        if (!result.granted) {
          Alert.alert(
            "Permissão necessária",
            "Autorize o acesso à câmera para fotografar a nota."
          );
          return;
        }
      }

      setCameraReady(false);
      navigateTo("camera");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível acessar a câmera.");
    }
  }

  async function takePhoto() {
    if (!cameraRef.current || !cameraReady) return;

    try {
      setLoading(true);

      const result = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (!result?.uri) {
        throw new Error("Foto não disponível");
      }

      addNote(
        {
          uri: result.uri,
          name: "nota-fiscal.jpg",
          mimeType: "image/jpeg",
          type: "image",
        },
        result.uri,
        null,
        true
      );
    } catch (error) {
      Alert.alert("Erro", "Não foi possível fotografar a nota.");
    } finally {
      setLoading(false);
    }
  }

  function updateField(key, value) {
    setInvoice((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function saveInvoice() {
    if (!currentNote) return;

    const updatedNote = {
      ...currentNote,
      invoice: { ...invoice },
    };

    setCurrentNote(updatedNote);

    setNotes((previous) =>
      previous.map((note) =>
        note.id === updatedNote.id ? updatedNote : note
      )
    );

    Alert.alert(
      "Dados atualizados",
      "As informações foram atualizadas nesta sessão."
    );

    // Retorna para os detalhes sem criar uma etapa extra no histórico.
    goBack();
  }

  function openDocument() {
    if (!currentNote?.file?.uri) return;

    if (currentNote.file.type === "image" && currentNote.photo) {
      navigateTo("preview");
      return;
    }

    if (currentNote.file.type === "pdf") {
      Linking.openURL(currentNote.file.uri).catch(() => {
        Alert.alert(
          "Não foi possível abrir",
          "Tente selecionar o PDF novamente."
        );
      });
      return;
    }

    Alert.alert(
      "Arquivo XML",
      "Este arquivo contém os dados estruturados da nota fiscal. Você pode consultar os campos extraídos na tela de detalhes."
    );
  }
    async function loadStatus() {
    setApiLoading(true);
    setApiError("");

    try {
      const baseUrl = API_BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/api/recebiveis/validar`);

      if (!response.ok) {
        throw new Error(`A API respondeu com o código ${response.status}.`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("A resposta da API não está no formato esperado.");
      }

      setApiResults(data);
    } catch (error) {
      setApiError(
        `Não foi possível consultar o backend. Verifique se ele está ligado e se API_BASE_URL está correto. ${error?.message || ""}`
      );
    } finally {
      setApiLoading(false);
    }
  }

  function showStatus() {
    navigateTo("status");
    loadStatus();
  }

  function renderStatus() {
    const currentNumber = String(invoice.numero || "").trim();

    const currentResult = currentNumber
      ? apiResults.find((item) => String(item.id ?? "").trim() === currentNumber)
      : null;

    return (
      <View style={styles.page}>
        <Text style={styles.heading}>Status das notas</Text>

        <Text style={styles.body}>
          Resultado da validação retornado pelo backend Antecipe.
        </Text>

        <Button
          title={apiLoading ? "Consultando..." : "Atualizar status"}
          onPress={loadStatus}
          secondary
        />

        {apiLoading && (
          <View style={styles.dataCard}>
            <ActivityIndicator color={C.green} />
            <Text style={styles.bodySmall}>Consultando a API...</Text>
          </View>
        )}

        {!!apiError && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Não foi possível carregar</Text>
            <Text style={styles.bodySmall}>{apiError}</Text>
          </View>
        )}

        {!apiLoading && !apiError && apiResults.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhum recebível retornado</Text>
            <Text style={styles.bodySmall}>
              A API respondeu sem notas. Verifique se o backend carregou o arquivo recebiveis.csv.
            </Text>
          </View>
        )}

        {currentNumber && !apiLoading && !apiError && !currentResult && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nota não encontrada na API</Text>
            <Text style={styles.bodySmall}>
              A nota {currentNumber} não apareceu na lista de recebíveis do backend. O arquivo selecionado no aplicativo não é enviado automaticamente para a API.
            </Text>
          </View>
        )}

        {apiResults.map((item, index) => {
          const approved = String(item.status || "").toUpperCase() === "APROVADO";
          const reasons = Array.isArray(item.barrado_por) ? item.barrado_por : [];
          const isCurrent =
            currentNumber && String(item.id ?? "").trim() === currentNumber;

          return (
            <View
              key={`${item.id ?? "nota"}-${index}`}
              style={styles.emptyCard}
            >
              <Text style={styles.cardTitle}>
                {item.id ? `Nota ${item.id}` : `Recebível ${index + 1}`}
                {isCurrent ? " · nota selecionada" : ""}
              </Text>

              <Text style={styles.dataLabel}>Validação</Text>
              <Text style={styles.dataValue}>
                {approved ? "APROVADA" : "BARRADA"}
              </Text>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.dataLabel}>Situação cadastral</Text>
                <Text style={styles.dataValue}>
                  {item.situacaoCadastral || "Não informada"}
                </Text>
              </View>

              {approved ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.dataLabel}>Valor previsto de compra</Text>
                  <Text style={styles.moneyValue}>
                    {item.valorCompra !== undefined
                      ? formatMoney(item.valorCompra)
                      : "Não informado"}
                  </Text>
                </View>
              ) : (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.dataLabel}>Motivos da reprovação</Text>
                  {reasons.length ? (
                    reasons.map((reason, reasonIndex) => (
                      <Text
                        key={`${index}-${reasonIndex}`}
                        style={styles.bodySmall}
                      >
                        • {reason}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.bodySmall}>
                      A API não retornou os motivos.
                    </Text>
                  )}
                </View>
              )}

              <View style={{ marginTop: 12 }}>
                <Text style={styles.dataLabel}>Situação da venda</Text>
                <Text style={styles.bodySmall}>
                  Não informada pelo backend atual. A API disponível valida recebíveis, mas não retorna envio ao comprador nem andamento da venda.
                </Text>
              </View>
            </View>
          );
        })}

        <Button title="Voltar aos detalhes" onPress={goBack} />
      </View>
    );
  }

  function renderHeader() {
    const canGoBack = history.length > 0 && screen !== "home";

    return (
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.headerBack}
          disabled={!canGoBack}
          activeOpacity={0.7}
        >
          {canGoBack && (
            <Text style={styles.backText}>← Voltar</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.headerBrand}>Antecipe</Text>
      </View>
    );
  }

  function renderHome() {
    return (
      <View style={styles.home}>
        <Text style={styles.eyebrow}>
          FINANÇAS INTELIGENTES
        </Text>

        <Logo />

        <Text style={styles.heading}>
          Bem-vindo ao{"\n"}Antecipe.
        </Text>

        <Text style={styles.body}>
          Transforme suas notas fiscais em oportunidades.
          {"\n\n"}
          Organize seus recebíveis e acompanhe as informações
          das suas notas em um só lugar.
        </Text>

        <View style={styles.fullWidth}>
          <Button
            title="Continuar  →"
            onPress={() => navigateTo("menu")}
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>
            Tudo em um só lugar
          </Text>

          <Text style={styles.bodySmall}>
            Envie documentos, confira informações e consulte
            suas notas fiscais.
          </Text>
        </View>
      </View>
    );
  }

  function renderMenu() {
    return (
      <View style={styles.page}>
        <Text style={styles.heading}>
          O que deseja fazer?
        </Text>

        <Text style={styles.body}>
          Escolha como adicionar sua nota fiscal.
        </Text>

        <TouchableOpacity
          style={styles.option}
          onPress={openCamera}
        >
          <Text style={styles.optionIcon}>📷</Text>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              Fotografar nota
            </Text>
            <Text style={styles.optionDesc}>
              Use a câmera do dispositivo.
            </Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => chooseFile("image")}
        >
          <Text style={styles.optionIcon}>🖼️</Text>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              Enviar imagem
            </Text>
            <Text style={styles.optionDesc}>
              Escolha uma foto existente.
            </Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => chooseFile("pdf")}
        >
          <Text style={styles.optionIcon}>📄</Text>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              Enviar PDF
            </Text>
            <Text style={styles.optionDesc}>
              Selecione um documento digital.
            </Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => chooseFile("xml")}
        >
          <Text style={styles.optionIcon}>🧾</Text>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              Enviar XML
            </Text>
            <Text style={styles.optionDesc}>
              Extraia os dados estruturados da nota fiscal.
            </Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => navigateTo("list")}
        >
          <Text style={styles.optionIcon}>📚</Text>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              Minhas notas
            </Text>
            <Text style={styles.optionDesc}>
              Consulte os documentos adicionados nesta sessão.
            </Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={showStatus}
        >
          <Text style={styles.optionIcon}>🔎</Text>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              Consultar validação
            </Text>
            <Text style={styles.optionDesc}>
              Consulte o status dos recebíveis retornado pela API.
            </Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>
    );
  }
    function renderList() {
    return (
      <View style={styles.page}>
        <Text style={styles.heading}>Minhas notas fiscais</Text>

        <Text style={styles.body}>
          Selecione uma nota para consultar os detalhes.
        </Text>

        {notes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhuma nota por aqui</Text>
            <Text style={styles.bodySmall}>
              Adicione uma imagem, PDF ou XML para começar.
            </Text>
            <Button
              title="Adicionar nota"
              onPress={() => navigateTo("menu")}
            />
          </View>
        ) : (
          notes.map((note) => (
            <TouchableOpacity
              key={note.id}
              style={styles.noteCard}
              onPress={() => openNote(note)}
            >
              <View style={styles.noteIcon}>
                <Text style={styles.noteIconText}>📄</Text>
              </View>

              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>
                  {note.invoice.numero
                    ? `Nota fiscal ${note.invoice.numero}`
                    : "Nota fiscal"}
                </Text>

                <Text style={styles.optionDesc}>{note.file.name}</Text>

                <Text style={styles.noteValue}>
                  {formatMoney(note.invoice.valor)}
                </Text>
              </View>

              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))
        )}

        <Button
          title="+ Adicionar outra nota"
          onPress={() => navigateTo("menu")}
          secondary
        />
      </View>
    );
  }

  function renderDetail() {
    if (!currentNote) {
      return (
        <View style={styles.page}>
          <Text style={styles.heading}>
            Nenhuma nota selecionada
          </Text>
          <Button title="Voltar às notas" onPress={goBack} />
        </View>
      );
    }

    return (
      <View style={styles.page}>
        <Text style={styles.heading}>Detalhes da nota</Text>

        <Text style={styles.body}>
          Confira os dados do documento enviado.
        </Text>

        <TouchableOpacity
          style={styles.detailCard}
          onPress={openDocument}
          activeOpacity={0.8}
        >
          <View style={styles.detailIcon}>
            <Text style={styles.detailEmoji}>📄</Text>
          </View>

          <View style={styles.optionContent}>
            <Text style={styles.detailTitle}>Nota fiscal</Text>
            <Text style={styles.optionDesc}>{currentNote.file.name}</Text>
            <Text style={styles.linkText}>Toque para visualizar →</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.dataCard}>
          <View style={styles.dataIcon}>
            <Text>🏪</Text>
          </View>

          <View style={styles.dataContent}>
            <Text style={styles.dataLabel}>Sacado</Text>
            <Text style={styles.dataValue}>
              {invoice.sacado || "Não identificado"}
            </Text>
          </View>
        </View>

        <View style={styles.dataCard}>
          <View style={styles.dataIcon}>
            <Text>📅</Text>
          </View>

          <View style={styles.dataContent}>
            <Text style={styles.dataLabel}>Vencimento</Text>
            <Text style={styles.dataValue}>
              {formatDate(invoice.vencimento)}
            </Text>
          </View>
        </View>

        <View style={styles.dataCard}>
          <View style={styles.dataIcon}>
            <Text>💰</Text>
          </View>

          <View style={styles.dataContent}>
            <Text style={styles.dataLabel}>Valor</Text>
            <Text style={styles.moneyValue}>
              {formatMoney(invoice.valor)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.statusCard}
          onPress={showStatus}
          activeOpacity={0.8}
        >
          <View style={styles.dataContent}>
            <Text style={styles.dataLabel}>Status</Text>
            <Text style={styles.dataValue}>{currentNote.status}</Text>
            <Text style={styles.linkText}>Consultar status →</Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <Button
          title="Editar dados da nota"
          onPress={() => navigateTo("edit")}
        />

        <Button
          title="Minhas notas fiscais"
          onPress={() => navigateTo("list")}
          secondary
        />
      </View>
    );
  }

  function renderPreview() {
    return (
      <View style={styles.page}>
        <Text style={styles.heading}>Visualizar nota fiscal</Text>
        <Text style={styles.body}>{currentNote?.file.name}</Text>

        {currentNote?.photo ? (
          <Image
            source={{ uri: currentNote.photo }}
            style={styles.preview}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.bodySmall}>
              Este documento não possui uma prévia de imagem disponível nesta tela.
            </Text>
          </View>
        )}

        <Button title="Voltar aos detalhes" onPress={goBack} />
      </View>
    );
  }

  function renderEdit() {
    return (
      <View style={styles.page}>
        <Text style={styles.heading}>Editar dados</Text>

        <Text style={styles.body}>
          Corrija as informações caso algum dado não tenha sido extraído automaticamente.
        </Text>

        {[
          ["numero", "Número da nota"],
          ["emissor", "Nome ou CNPJ do emissor"],
          ["sacado", "Nome da loja (sacado)"],
          ["emissao", "Data de emissão"],
          ["vencimento", "Data de vencimento"],
          ["valor", "Valor da nota"],
        ].map(([key, label]) => (
          <View key={key} style={styles.field}>
            <Text style={styles.label}>{label}</Text>

            <TextInput
              style={styles.input}
              value={String(invoice[key] ?? "")}
              onChangeText={(value) => updateField(key, value)}
              placeholder={label}
              placeholderTextColor="#89948C"
              autoCapitalize="none"
            />
          </View>
        ))}

        <Button title="Salvar alterações" onPress={saveInvoice} />

        <Button
          title="Cancelar"
          onPress={goBack}
          secondary
        />
      </View>
    );
  }

  function renderCamera() {
    return (
      <View style={styles.cameraPage}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
        />

        <View style={styles.cameraControls}>
          <View style={styles.cameraButton}>
            <Button
              title="Voltar"
              secondary
              onPress={goBack}
            />
          </View>

          <View style={styles.cameraButton}>
            <Button
              title={loading ? "Capturando..." : "Tirar foto"}
              onPress={takePhoto}
            />
          </View>
        </View>

        {!cameraReady && (
          <View style={styles.cameraLoading}>
            <ActivityIndicator size="large" color={C.lime} />
            <Text style={styles.cameraLoadingText}>
              Preparando câmera...
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.bg}
      />

      {screen === "camera" ? (
        renderCamera()
      ) : (
        <ScrollView
          style={styles.safe}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {renderHeader()}

          {screen === "home" && renderHome()}
          {screen === "menu" && renderMenu()}
          {screen === "list" && renderList()}
          {screen === "detail" && renderDetail()}
          {screen === "status" && renderStatus()}
          {screen === "preview" && renderPreview()}
          {screen === "edit" && renderEdit()}

          <View style={styles.footer}>
            <View style={styles.footerLine} />

            <Text style={styles.footerTitle}>
              ANTECIPE © 2026
            </Text>

            <Text style={styles.muted}>
              O futuro dos seus recebíveis começa aqui.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },

  header: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerBack: {
    minWidth: 65,
    minHeight: 38,
    justifyContent: "center",
  },

  headerBrand: {
    fontSize: 19,
    fontWeight: "800",
    color: C.green,
  },

  backText: {
    color: C.green,
    fontWeight: "700",
    paddingVertical: 8,
  },

  home: {
    alignItems: "center",
    paddingTop: 26,
    paddingBottom: 25,
  },

  fullWidth: {
    width: "100%",
  },

  page: {
    paddingTop: 26,
    paddingBottom: 30,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: C.muted,
    marginBottom: 22,
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },

  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  logoSymbol: {
    fontSize: 51,
    color: C.lime,
    fontWeight: "800",
  },

  logoName: {
    fontSize: 29,
    fontWeight: "800",
    color: C.green,
    letterSpacing: -1,
  },

  logoCaption: {
    fontSize: 9,
    letterSpacing: 2,
    color: C.muted,
    marginTop: 6,
    fontWeight: "700",
  },

  heading: {
    fontSize: 30,
    lineHeight: 39,
    fontWeight: "800",
    letterSpacing: -1,
    color: C.text,
    marginBottom: 14,
  },

  body: {
    fontSize: 15,
    lineHeight: 24,
    color: C.muted,
    marginBottom: 24,
  },

  bodySmall: {
    fontSize: 13,
    lineHeight: 21,
    color: C.muted,
  },

  button: {
    minHeight: 54,
    backgroundColor: C.green,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },

  buttonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "700",
  },

  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: C.border,
  },

  secondaryText: {
    color: C.green,
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    padding: 16,
    marginTop: 12,
  },

  optionIcon: {
    width: 43,
    height: 43,
    textAlign: "center",
    textAlignVertical: "center",
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: C.soft,
    fontSize: 22,
    marginRight: 13,
  },

  optionContent: {
    flex: 1,
  },

  optionTitle: {
    color: C.text,
    fontWeight: "700",
    fontSize: 15,
  },

  optionDesc: {
    color: C.muted,
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
  },

  chevron: {
    fontSize: 27,
    color: C.green,
    marginLeft: 8,
  },

  infoCard: {
    backgroundColor: "#EAF0E8",
    padding: 20,
    borderRadius: 17,
    marginTop: 25,
    width: "100%",
  },

  cardTitle: {
    color: C.green,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },

  noteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
  },

  noteIcon: {
    width: 45,
    height: 45,
    backgroundColor: C.soft,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  noteIconText: {
    fontSize: 22,
  },

  noteValue: {
    color: C.green,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },

  detailCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },

  detailIcon: {
    width: 48,
    height: 48,
    backgroundColor: C.soft,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  detailEmoji: {
    fontSize: 23,
  },

  linkText: {
    color: C.green,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },

  dataCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
  },

  dataIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
    fontSize: 19,
  },

  dataContent: {
    flex: 1,
  },

  dataLabel: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 5,
  },

  dataValue: {
    color: C.text,
    fontSize: 15,
    fontWeight: "700",
  },

  moneyValue: {
    color: C.green,
    fontSize: 21,
    fontWeight: "800",
  },

  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF0E8",
    borderRadius: 15,
    padding: 17,
    marginTop: 4,
    marginBottom: 14,
  },

  field: {
    marginBottom: 15,
  },

  label: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
  },

  input: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: C.text,
  },

  preview: {
    width: "100%",
    height: 420,
    backgroundColor: C.white,
    borderRadius: 14,
    marginBottom: 18,
  },

  emptyCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 22,
    marginVertical: 10,
  },

  emptyTitle: {
    color: C.green,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
  },

  cameraPage: {
    flex: 1,
    backgroundColor: "#101713",
  },

  camera: {
    flex: 1,
  },

  cameraControls: {
    padding: 16,
    backgroundColor: C.bg,
    flexDirection: "row",
    gap: 12,
  },

  cameraButton: {
    flex: 1,
  },

  cameraLoading: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    alignItems: "center",
  },

  cameraLoadingText: {
    color: C.white,
    marginTop: 12,
  },

  footer: {
    alignItems: "center",
    marginTop: "auto",
    paddingVertical: 20,
  },

  footerLine: {
    height: 1,
    width: "100%",
    backgroundColor: C.border,
    marginBottom: 17,
  },

  footerTitle: {
    color: C.green,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },

  muted: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
    textAlign: "center",
  },
});