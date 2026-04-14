import type { CanvasDocument } from '@knowledgeos/types/canvas.js'

/**
 * Built-in example canvas: "Transformer Architecture" knowledge decomposition
 */
export const EXAMPLE_CANVAS: CanvasDocument = {
  nodes: [
    // CORE - 중심 주제
    {
      id: 'topic-1',
      type: 'text',
      x: 0,
      y: 0,
      width: 450,
      height: 120,
      color: '6',
      text: '# Transformer Architecture\n\nAttention Is All You Need (2017)',
    },

    // NORTH - 추상/일반 (상위 개념)
    {
      id: 'north-1',
      type: 'text',
      x: 25,
      y: -280,
      width: 400,
      height: 120,
      color: '6',
      text: '## Sequence-to-Sequence Models\n\n시퀀스 입력을 시퀀스 출력으로 변환하는 모델 계열',
    },

    // SOUTH - 구체/상세 (정의, 답변)
    {
      id: 'south-1',
      type: 'text',
      x: 0,
      y: 240,
      width: 450,
      height: 180,
      color: '3',
      text: '## 핵심 정의\n\nTransformer는 **Self-Attention** 메커니즘만으로 구성된 인코더-디코더 구조.\n\n- RNN/CNN 없이 병렬 처리 가능\n- Positional Encoding으로 순서 정보 보존\n- Multi-Head Attention으로 다양한 관계 포착',
    },

    // WEST - 배경/원인
    {
      id: 'west-1',
      type: 'text',
      x: -520,
      y: -30,
      width: 380,
      height: 150,
      color: '2',
      text: '## 배경: RNN의 한계\n\n- 순차 처리로 인한 병렬화 불가\n- Long-range dependency 학습 어려움\n- Vanishing gradient 문제',
    },
    {
      id: 'west-2',
      type: 'text',
      x: -520,
      y: 160,
      width: 380,
      height: 120,
      color: '2',
      text: '## 동기\n\nGoogle Brain팀의 기계번역 성능 향상 목표.\n병렬 처리를 통한 학습 속도 개선.',
    },

    // EAST - 결과/확장
    {
      id: 'east-1',
      type: 'text',
      x: 570,
      y: -30,
      width: 350,
      height: 120,
      color: '4',
      text: '## 파생 모델들\n\n- **BERT** (인코더만)\n- **GPT** (디코더만)\n- **T5** (인코더-디코더)',
    },
    {
      id: 'east-2',
      type: 'text',
      x: 570,
      y: 130,
      width: 350,
      height: 100,
      color: '4',
      text: '? Transformer가 NLP를 넘어 Vision에도 적용 가능한 이유는?',
    },

    // NORTH_WEST - 추상적 배경 (이론, 선행지식)
    {
      id: 'nw-1',
      type: 'text',
      x: -520,
      y: -280,
      width: 380,
      height: 120,
      color: '2',
      text: '## 선행 이론: Attention\n\nBahdanau Attention (2014)\n- 디코더가 인코더의 모든 hidden state에 가중치 부여',
    },

    // NORTH_EAST - 추상적 확장 (관련 개념)
    {
      id: 'ne-1',
      type: 'text',
      x: 570,
      y: -280,
      width: 350,
      height: 120,
      color: '4',
      text: '## 관련 개념: Scaling Laws\n\n모델 크기, 데이터, 연산량의 관계.\nTransformer의 확장성이 이를 가능하게 함.',
    },

    // SOUTH_EAST - 구체적 확장 (예시, 적용)
    {
      id: 'se-1',
      type: 'text',
      x: 570,
      y: 350,
      width: 350,
      height: 150,
      color: '5',
      text: '## 적용 예시\n\n- **ChatGPT**: 대화형 AI\n- **GitHub Copilot**: 코드 생성\n- **DALL-E**: 이미지 생성\n- **AlphaFold 2**: 단백질 구조 예측',
    },

    // SOUTH_WEST - 구체적 배경 (반례, 한계)
    {
      id: 'sw-1',
      type: 'text',
      x: -520,
      y: 350,
      width: 380,
      height: 130,
      color: '1',
      text: '## 한계점\n\n- O(n^2) 메모리 복잡도 (시퀀스 길이)\n- 위치 정보를 자체적으로 인코딩 못함\n- 대규모 학습 데이터/연산 자원 필요',
    },

    // Reference link
    {
      id: 'link-1',
      type: 'link',
      x: 570,
      y: 540,
      width: 350,
      height: 80,
      color: '5',
      url: 'https://arxiv.org/abs/1706.03762',
    },
  ],

  edges: [
    // Topic → Definition (핵심 연결)
    {
      id: 'e-topic-def',
      fromNode: 'topic-1',
      toNode: 'south-1',
      fromSide: 'bottom',
      toSide: 'top',
      color: '3',
      label: 'definition',
    },
  ],
}
