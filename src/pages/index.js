/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { Component } from 'react';

import {

  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Animated
} from 'react-native';

import { Input, Avatar, Text, SearchBar, ListItem, Button, Dialog } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import aiApi from '../api/ai';
import storage from '../util/quickStorage';


export default class Index extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showMenu: false,
      today: Number,
      comment: '',
      chat: {
        // 1: [
        //   { role: 'user', content: '111' },
        //   { role: 'system', content: '222' },
        // ],
        // 2: [
        //   { role: 'user', content: '111' },
        // ],
        // 3: [
        //   { role: 'user', content: '3333' }
        // ]
      },
      menu: {
        // 20240603: [
        //   { id: 1, title: "222" }
        // ],
        // 20240604: [
        //   { id: 3, title: "三三" },
        //   { id: 2, title: "111" },
        // ]
      },
      nowId: '',
      nowChat: [],
      visible: new Animated.Value(0),
      text: "",
      aiIndex: null,
      filterMenu: {},
      hasFilter: false,
      loading: false,
      dialogVisible: false
    }
  }

  componentDidMount() {
    const t = this.getToday();
    const { menu, chat } = this.state;
    
    storage.load({key: 'gptmenu'}).then(res => {
      this.setState({ menu: JSON.parse(res) })
    }).catch(err => {
      
      switch (err.name) {
        case 'NotFoundError':
          // TODO;
          this.setState({ menu: {} })
          break;
      }
    })
    storage.load({key: 'gptchat'}).then(res => {
      this.setState({ chat: JSON.parse(res) })
    }).catch(err => {
      switch (err.name) {
        case 'NotFoundError':
          // TODO;
          this.setState({ chat: {} })
          break;
      }
    })

    let ml = [];
    if (t in menu) {
      ml = menu[t];
    }
    let index = ml.findIndex(item => t == item.date)
    let newChat = index === - 1 ? [] : chat[ml[index].id];
    this.setState({ today: Number(t), nowChat: newChat });
  }

  getToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}${month}${day}`;
    return formattedDate;
  }

  setMenu = () => {
    if(this.state.loading) return;
    this.setState(prev => ({ showMenu: !prev.showMenu }))
  }

  setMenuFalse = () => {
    if(this.state.showMenu) {
      this.setState(prev => ({ showMenu: false }))
    }
  }
  //切换menu 变化数据
  setChat = (id) => {
    let chat = this.state.chat[id];
    this.setState({ nowChat: chat, showMenu: false, nowId: id, aiIndex: null });
  }

  filterVal = (newVal) => {
    let filterMenu = {};
    if(newVal!= '') {
      for(let i in this.state.menu) {
        let d = this.state.menu[i].filter(item =>
          item.title.includes(newVal)
        );
       
        if(d.length > 0) filterMenu[i] = d;

      }
    }
    this.setState({ filterMenu: newVal == '' ? {} : filterMenu, hasFilter: newVal != '' })
  }
  //创建新对话
  addMenu = () => {
    let { menu, today, comment, chat } = this.state;
    let ml = JSON.stringify(menu) != '{}' ? menu[today] : [];
    let l = Object.values(menu).map(arr => arr.length);
    id = l.reduce((prev, cur) => prev + cur, 0) + 1;
    ml.unshift({ id, title: comment, date: today });
    menu[today] = ml;
    chat[id] = [];
    this.setState({ menu, chat, nowChat: chat[id], nowId: id });
    storage.save({key: 'gptmenu', data: JSON.stringify(menu), expires: 1000 * 3600 * 24 * 10});
  }
  //Input
  onSubmit = () => {
    this.setState({ loading: true });
    let { chat, comment, menu, today, nowId } = this.state;
    let ml = today in menu ? menu[today] : [];
    let id = -1;
   
    if (nowId === '' || ml.length === 0) {
      //创建新数据
      let l = Object.values(menu).map(arr => arr.length);
      id = l.reduce((prev, cur) => prev + cur, 0) + 1;
     
      ml.unshift({ id, title: comment, date: today });
      menu[today] = ml;
      chat[id] = [];
      this.setState({ menu });
    } else {
      //找到数据id  
      id = nowId;
      let mIndex = ml.findIndex(i => i.id === id);
      let obj = ml[mIndex];
      if (obj.title === "") {
        obj.title = comment;
        ml.splice(mIndex, 1, obj);
        menu[today] = ml;
        this.setState({ menu });
      }
    }
    if (id === -1) return;
    chat[id].push({ role: 'user', content: comment });
    this.setState({ chat, comment: '', nowChat: chat[id] });
    if (nowId === '') this.setState({ nowId: id });
    
    this.getAiChat(id);
    
  }

   getAiChat = async (id) => {
    const { chat, menu  } = this.state;
    let a = JSON.parse(JSON.stringify(chat[id]));
    
    let res = await aiApi.getComment(
      {
        "model": "gpt-3.5-turbo",
        "messages": a
      }
    );
    const  { choices } = res.data;
    choices.map(i => {
      chat[id].push(i.message);
    })
    
    

    this.setState({ chat, nowChat: chat[id], text: choices[0].message.content, aiIndex: chat[id].length - 1  });
   
    storage.save({key: 'gptchat', data: JSON.stringify(chat), expires: 1000 * 3600 * 24 * 10});
    storage.save({key: 'gptmenu', data: JSON.stringify(menu), expires: 1000 * 3600 * 24 * 10});
    
    this.animateText();
    this.setState({ loading: false });
  }

  animateText = () => {
    const { text, visible } = this.state;
    const runAnimation = () => {
      if (text.length === 0) {
        visible.setValue(0);
      }
      Animated.spring(visible, {
        toValue: 1,
        useNativeDriver: true,
      }).start(() => {
        runAnimation(); // 动画完成后继续执行
      });
    };
    runAnimation();
  };

  toggleDialog = (flag) => {
    this.setState({ dialogVisible: flag});
  }

  really = () => {
    storage.remove({
      key: 'gptmenu',
    });
    storage.remove({
      key: 'gptchat',
    });
    this.setState({ dialogVisible: false, menu: {}, nowId: '', aiIndex: null, chat: {}, nowChat: {}});
  }



  render() {
    let m =  this.state.hasFilter ? JSON.parse(JSON.stringify( this.state.filterMenu)) : JSON.parse(JSON.stringify(this.state.menu));
    return (
      <View style={styles.flex}>
        {this.state.showMenu &&
          <TouchableOpacity onPress={this.setMenu}>
            <View style={styles.w1} >
              <View style={[styles.flex,styles.st]}>
                <SearchBar
                  platform="android"
                  containerStyle={styles.mBg}
                  inputContainerStyle={styles.mInputBg}
                  inputStyle={styles.iptf}
                  onChangeText={newVal => this.filterVal(newVal)}
                  onClearText={() => console.log(onClearText())}
                  placeholder="搜索"
                  placeholderTextColor="#888"
                  round
                  cancelButtonTitle="Cancel"
                  onCancel={() => console.log(onCancel())}
                  value={this.state.value}
                />
                {JSON.stringify(this.state.menu) != '{}' && <Ionicons  onPress={() => this.toggleDialog(true)} name={'trash-outline'} style={styles.del} size={26} color={'white'} ></Ionicons>}
              </View>
              { JSON.stringify(this.state.menu) == '{}' ? (<Text style={styles.t2}>暂无结果</Text>):
              (<ScrollView>
                {Object.keys(m).sort((a,b)=> b-a).map((key) => {
                  const today = this.state.today;
                  return (
                    <View key={key}>
                      <Text style={styles.tg}>{(today - key) === 0 ? '今天' : (today - key) === 1 ? '昨天' : `${today - key}天前`}</Text>
                      <View>{Array.isArray(m[key]) ? m[key].map((info, index) => {
                        return (
                          <ListItem
                            onPress={() => this.setChat(info.id)}
                            key={`${key}-${index}`}
                            containerStyle={styles.bgColor}
                          >
                            {/* <Avatar rounded title="A" containerStyle={styles.avatarBg} /> */}
                            <ListItem.Content>
                              <ListItem.Title style={[styles.lt, info.id == this.state.nowId ? styles.light : '']}>{info.title}</ListItem.Title>
                            </ListItem.Content>
                          </ListItem>
                        );
                      }) : null}
                      </View>
                    </View>
                  )
                })} 
              </ScrollView>)}
            </View>
          </TouchableOpacity>
        }
        <TouchableOpacity onPress={this.setMenuFalse}>
          <View style={styles.wrap}>
            <View style={[styles.flex, styles.title]}>
              <Ionicons name={'reorder-two-outline'} size={30} color={'black'} onPress={this.setMenu}></Ionicons>
              <View>
                <Text>ai</Text>
              </View>
              <View style={styles.empty}></View>
              {/* <Text style={[styles.item,styles.itemRight]}>图片</Text> */}
            </View>
            <View style={styles.h}>
              <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                {Array.isArray(this.state.nowChat) ? this.state.nowChat.map((info, index) => {
                  return (
                    info.role === 'user' ? (<View key={index} style={[styles.twrap, styles.rc, index === 0 ? '' : styles.rt]}>
                      <Text style={[styles.t2, styles.rw]}>{info.content}</Text>
                    </View>) :
                      (<View style={[styles.flex, styles.rcenter]} key={index}>
                        <Avatar
                          size={32}
                          rounded
                          title="AI"
                          containerStyle={{ backgroundColor: "black" }}
                        />
                        <View style={[styles.lwrap, styles.lc]}>
                        { this.state.aiIndex == index ? (this.state.text && <Animated.Text
                            style={{ opacity: this.state.visible }}
                            // 使用FadeIn动画
                          >
                            {this.state.text.split('').map((char, index1) => (
                              <Text style={[styles.t1, styles.lw]} key={`${index1}ai`}>{char}</Text>
                            ))}
                          </Animated.Text>)
                          : (<Text style={[styles.t1, styles.lw]}>{info.content}</Text>) }
                        </View>

                      </View>)
                  );
                }) : null}
              </ScrollView>
            </View>

            <View style={[styles.flex, styles.box, styles.icenter]}>
              <Button
                containerStyle={styles.btn}
                buttonStyle={styles.bs}
                titleStyle={[styles.add]}
                title={this.state.loading ? '' : '+'}
                onPress={this.addMenu}
                disabled={ this.state.loading }
                loading={ this.state.loading }
              >

              </Button>
              <Input

                placeholder='消息'
                containerStyle={styles.container}
                inputContainerStyle={styles.ipt}
                inputStyle={styles.iptf}
                value={this.state.comment}
                onChangeText={value => this.setState({ comment: value })}
                onSubmitEditing={this.onSubmit}
                disabled={ this.state.loading }
              />
            </View>

          </View>
        </TouchableOpacity>
        <Dialog
          isVisible={this.state.dialogVisible}
          onBackdropPress={() => this.toggleDialog(true)}
        >
          <Dialog.Title title="提示"/>
          <Text>是否删除全部？</Text>
          <Dialog.Actions>
            <Dialog.Button titleStyle={{color: '#435334'}} title="确定" onPress={() => this.really()}/>
            <Dialog.Button titleStyle={{color: '#9eb384'}} title="取消" onPress={() => this.toggleDialog(false)}/>
          </Dialog.Actions>
        </Dialog>
      </View>

    );

  }

}


const styles = StyleSheet.create({
  wrap: {
    height: Dimensions.get('window').height,
    width: Dimensions.get('window').width,
    paddingLeft: 20,
    paddingRight: 20,
  },
  icon: {
    color: 'black'
  },
  t1: {
    color: 'black',
    lineHeight: 20,
  },
  t2: {
    color: 'white',
    lineHeight: 20,
  },
  flex: {
    flexDirection: 'row',
  },
  itemRight: {
    textAlign: 'right'
  },
  content: {
    height: '100%',
  },
  btn: {
    margin: 5,
  },
  bs: {
    height: 32,
    width: 32,
    borderRadius: 100,
    backgroundColor: '#435334'
  },
  add: {
    fontSize: 16,
    lineHeight: 18,
    color: 'rgb(255, 255, 255)',
    includeFontPadding: false,
    textAlignVertical: 'center', 
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  ipt: {
    borderColor: '#435334',
    borderWidth: 1,
    borderRadius: 50,
    width: Dimensions.get('window').width - 95,
    height: 36,
    paddingLeft: 5,
    paddingRight: 5
  },
  iptf: {
    fontSize: 14
  },
  container: {
    width: Dimensions.get('window').width - 50
  },
  h: {
    flex: 1,
    paddingBottom: 10
  },
  twrap: {
    maxWidth: (Dimensions.get('window').width - 40) / 2,
    flexWrap: 'wrap',
    flexDirection: 'row',
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 5,
    paddingBottom: 5
  },
  lwrap: {
    maxWidth: (Dimensions.get('window').width - 75.5),
    flexWrap: 'wrap',
    flexDirection: 'row',
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 5,
    paddingBottom: 5
  },
  rc: {
    alignSelf: 'flex-end',
    backgroundColor: '#435334',
    borderRadius: 8
  },
  rcenter: {
    alignItems: 'flex-start',
    marginTop: 10

  },
  lc: {
    backgroundColor: '#CEDEBD',
    borderRadius: 8,
    marginLeft: 5,
  },
  w1: {
    width: Dimensions.get('window').width - 50,
    height: Dimensions.get('window').height,
    backgroundColor: '#435334',
    paddingTop: 10,
    paddingLeft: 20,
    paddingRight: 20,
  },
  mBg: {
    backgroundColor: '#435334',
    borderWidth: 0,
    width: Dimensions.get('window').width - 140,
    marginBottom: 10
  },
  mInputBg: {
    backgroundColor: 'rgb(250, 250, 250)',
    borderRadius: 10,
    height: 36,
    paddingLeft: 5,
    paddingRight: 5
  },
  bgColor: {
    backgroundColor: 'transparent',
    borderRadius: 5
  },
  avatarBg: {
    backgroundColor: 'grey',
    borderRadius: 50
  },
  empty: {
    width: 30,
    height: 30
  },
  title: {
    justifyContent: 'space-between',
    height: 40,
    paddingTop: 10
  },
  rt: {
    marginTop: 10
  },
  lw: {
    maxWidth: (Dimensions.get('window').width - 40)
  },
  rw: {
    maxWidth: (Dimensions.get('window').width - 40) / 2
  },
  tg: {
    color: 'white'
  },
  lt: {
    fontSize: 14,
    color: 'white'
  },
  light: {
    color: '#FAF1E4',
    fontWeight: 'bold'
  },
  icenter: {
    paddingLeft: 20,
    justifyContent: 'center',
  },
  st: {
    alignItems: 'center'
  },
  del: {
    marginLeft: 15
  }
})